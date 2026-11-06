"""Anonymous call analytics: a calls-to-bookings funnel in PostHog (#1573).

Each call sends a handful of events to the website's PostHog project so the
funnel can sit next to the site's own booking clicks. Nothing identifies the
caller:

- Every call gets a fresh random ``call_id`` (a UUID4) that is also its
  PostHog ``distinct_id``. It is never derived from the caller, so two calls
  from one number can't be linked.
- Public calls make no PostHog person (``$process_person_profile: false``),
  and GeoIP is off: the request comes from LiveKit Cloud, not the caller.
- Events and their properties come from a closed allowlist
  (``EVENT_PROPERTIES``): booleans, whole numbers, and strings from fixed
  sets. A value that doesn't fit is dropped with the whole event, so free
  text such as a name or an address has no way in. A ``before_send`` hook
  then strips everything the SDK adds except its own markers.
- The owner's test calls are recognized by comparing caller ID with the
  ``OWNER_PHONE`` secret inside the agent. Only the result is sent: the
  call's one-off person gets ``$internal_or_test_user: true``, which puts it
  in the project's internal cohort and out of the default views. The number
  itself is never sent.

Analytics can't break a call. Capture only queues an event for the SDK's
background thread, every call into the SDK is wrapped, and the final flush
runs in a worker thread with a short timeout. With no ``POSTHOG_PROJECT_TOKEN``
set, nothing is sent at all.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from collections.abc import Callable
from typing import Any, Protocol

# Imported here, not on first use: posthog imports distro at load time, which
# blocked the call's event loop for 310 ms when it happened mid-call.
import posthog

from calcom import (
    BookingLimitError,
    BookingOutcomeUnknownError,
    BookingWindowError,
    CalComError,
    CalendarUnavailableError,
    EmailRejectedError,
    SlotUnavailableError,
)

logger = logging.getLogger("analytics")

DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"

# PostHog classifies an event with no user agent as a bot, and the project's
# default filter drops bots, so every call would vanish from default views.
# A named, non-browser agent string classifies as regular traffic. It
# describes this agent, not the caller.
AGENT_USER_AGENT = "nathanpayne-receptionist/1.0"

FAILURE_REASONS = frozenset(
    {
        "slot_taken",
        "limit",
        "window",
        "email_rejected",
        "unconfirmed",
        "unavailable",
        "other",
    }
)
END_REASONS = frozenset({"caller", "agent", "cap", "error", "other"})

# The allowlist. Each property is a type (bool or int, exactly), a tuple of
# allowed types (None means null), or a frozenset of allowed strings.
EVENT_PROPERTIES: dict[str, dict[str, Any]] = {
    "receptionist_call_started": {"caller_id_present": bool},
    "receptionist_slots_offered": {
        "duration_minutes": int,
        "slot_count": int,
        "day_requested": bool,
    },
    "receptionist_booking_reviewed": {
        "duration_minutes": int,
        "invite_requested": bool,
    },
    "receptionist_booking_created": {
        "duration_minutes": int,
        "invite_requested": bool,
        "email_kept": (bool, None),
    },
    "receptionist_booking_failed": {"reason": FAILURE_REASONS},
    "receptionist_call_ended": {
        "duration_seconds": int,
        "booked": bool,
        "ended_by": END_REASONS,
    },
}

# Keys the SDK adds that may reach PostHog: its library markers, and the
# flags this module sets. Everything else the SDK adds (the server's OS and
# Python version) is stripped before sending.
_WIRE_KEYS = frozenset(
    {
        "call_id",
        "$process_person_profile",
        "$geoip_disable",
        "$raw_user_agent",
        "$set",
        "$lib",
        "$lib_version",
        "$is_server",
    }
)

FLUSH_TIMEOUT_SECONDS = 3.0
# A call sends a handful of events, so send each batch almost at once: the
# job process can end soon after the call does.
FLUSH_INTERVAL_SECONDS = 0.5


def failure_reason(exc: CalComError) -> str:
    """The reason label for a Cal.com booking error, never its message."""
    for error_type, reason in (
        (SlotUnavailableError, "slot_taken"),
        (BookingLimitError, "limit"),
        (BookingWindowError, "window"),
        (EmailRejectedError, "email_rejected"),
        (BookingOutcomeUnknownError, "unconfirmed"),
        (CalendarUnavailableError, "unavailable"),
    ):
        if isinstance(exc, error_type):
            return reason
    return "other"


def _fits(value: object, rule: Any) -> bool:
    if isinstance(rule, frozenset):
        return isinstance(value, str) and value in rule
    if isinstance(rule, tuple):
        return any(_fits(value, option) for option in rule)
    if rule is None:
        return value is None
    # type(...) is, not isinstance: a bool must not pass as an int.
    return type(value) is rule


class Sink(Protocol):
    def capture(self, event: str, *, distinct_id: str, properties: dict) -> None: ...

    def flush(self, timeout_seconds: float) -> None: ...


class PostHogSink:
    """The real sink: PostHog's Python SDK, queued and sent off-thread."""

    def __init__(
        self,
        project_token: str,
        *,
        host: str = DEFAULT_POSTHOG_HOST,
        _send: bool = True,
        _observe: Callable[[dict], None] | None = None,
    ) -> None:
        self._observe = _observe
        self._client = posthog.Posthog(
            project_token,
            host=host,
            send=_send,
            disable_geoip=True,
            timeout=5,
            max_retries=1,
            flush_interval=FLUSH_INTERVAL_SECONDS,
            enable_exception_autocapture=False,
            before_send=self._before_send,
        )

    def _before_send(self, msg: dict) -> dict | None:
        properties = msg.get("properties") or {}
        allowed = _WIRE_KEYS | EVENT_PROPERTIES.get(msg.get("event", ""), {}).keys()
        msg["properties"] = {k: v for k, v in properties.items() if k in allowed}
        if self._observe is not None:
            self._observe(msg)
        return msg

    def capture(self, event: str, *, distinct_id: str, properties: dict) -> None:
        self._client.capture(event, distinct_id=distinct_id, properties=properties)

    def flush(self, timeout_seconds: float) -> None:
        self._client.flush(timeout_seconds=timeout_seconds)


class CallAnalytics:
    """One call's events. Every method is safe to call and never raises."""

    def __init__(
        self,
        sink: Sink | None = None,
        *,
        internal: bool = False,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._sink = sink
        self._internal = internal
        self._clock = clock
        self.call_id = str(uuid.uuid4())
        self._started_at: float | None = None
        self._ended = False
        self._flush_task: asyncio.Task[None] | None = None

    @property
    def enabled(self) -> bool:
        return self._sink is not None

    def capture(self, event: str, **properties: object) -> None:
        if self._sink is None:
            return
        rules = EVENT_PROPERTIES.get(event)
        if rules is None:
            logger.warning("analytics: unknown event %s dropped", event)
            return
        if set(properties) != set(rules):
            logger.warning("analytics: %s had the wrong properties; dropped", event)
            return
        for key, rule in rules.items():
            if not _fits(properties[key], rule):
                # Name the key, never the value: the value is what didn't fit.
                logger.warning("analytics: %s.%s didn't fit; dropped", event, key)
                return
        payload: dict[str, object] = {
            **properties,
            "call_id": self.call_id,
            "$raw_user_agent": AGENT_USER_AGENT,
            "$geoip_disable": True,
            "$process_person_profile": self._internal,
        }
        if self._internal:
            payload["$set"] = {"$internal_or_test_user": True}
        try:
            self._sink.capture(event, distinct_id=self.call_id, properties=payload)
        except Exception:
            logger.exception("analytics: capture failed for %s", event)

    # -- the events with their own timing rules --

    def call_started(self, *, caller_id_present: bool) -> None:
        self._started_at = self._clock()
        self.capture("receptionist_call_started", caller_id_present=caller_id_present)

    def call_ended(self, *, booked: bool, ended_by: str) -> None:
        """Send the call's last event. Only the first call counts."""
        if self._ended:
            return
        self._ended = True
        elapsed = 0.0 if self._started_at is None else self._clock() - self._started_at
        self.capture(
            "receptionist_call_ended",
            duration_seconds=max(0, round(elapsed)),
            booked=booked,
            ended_by=ended_by if ended_by in END_REASONS else "other",
        )
        # Start sending now: the job's shutdown can follow quickly. With no
        # running event loop (a plain unit test), aclose() flushes instead.
        with contextlib.suppress(RuntimeError):
            self._start_flush()

    def _start_flush(self) -> asyncio.Task[None] | None:
        if self._sink is None:
            return None
        if self._flush_task is None:
            loop = asyncio.get_running_loop()
            self._flush_task = loop.create_task(self._flush(), name="analytics-flush")
        return self._flush_task

    async def _flush(self) -> None:
        assert self._sink is not None
        try:
            await asyncio.wait_for(
                asyncio.to_thread(self._sink.flush, FLUSH_TIMEOUT_SECONDS),
                FLUSH_TIMEOUT_SECONDS + 1,
            )
        except Exception:
            logger.exception("analytics: flush failed")

    async def aclose(self) -> None:
        """Wait for the final send, without holding up the job's shutdown."""
        task = self._start_flush()
        if task is not None:
            await task
