"""A small Cal.com API v2 client: list open slots and create a booking.

Adapted from ``examples/frontdesk/calendar_api.py`` in livekit/agents
(Copyright LiveKit, Inc., Apache License 2.0; see NOTICE). Changes from the
original: the event type is configured by ID instead of being looked up or
created by slug, bookings are phone-only (the owner calls the attendee),
bookings carry an explicit length, and Cal.com failures map to typed errors
that carry a sentence the agent can say.

Endpoint reference:
- Slots: https://cal.com/docs/api-reference/v2/slots/get-available-time-slots-for-an-event-type
- Bookings: https://cal.com/docs/api-reference/v2/bookings/create-a-booking
"""

from __future__ import annotations

import contextlib
import datetime as dt
import logging
from dataclasses import dataclass
from typing import Any, Protocol

import aiohttp

logger = logging.getLogger("calcom")

BASE_URL = "https://api.cal.com/v2/"

# Each Cal.com v2 endpoint is versioned by the cal-api-version header. Both
# values were checked against the live API on 2026-11-05. (The current
# bookings reference lists 2026-02-25 for create-a-booking; the request body
# schema is the same, and 2024-08-13 is the version proven to work here.)
SLOTS_API_VERSION = "2024-09-04"
BOOKINGS_API_VERSION = "2024-08-13"

# Cal.com's edge rejects some default client User-Agents with a non-JSON
# error, so every request names this client explicitly.
USER_AGENT = "livekit-receptionist/0.1.0"

REQUEST_TIMEOUT_SECONDS = 10.0

WEBSITE_FALLBACK = "nathanpayne dot com slash book"


# --- errors -----------------------------------------------------------------


class CalComError(Exception):
    """A Cal.com request failed. ``spoken`` is safe to say to the caller."""

    spoken = (
        "Sorry, the booking didn't go through. You can try another time, "
        f"or book on the website at {WEBSITE_FALLBACK}."
    )

    def __init__(self, detail: str, *, status: int | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status = status


class SlotUnavailableError(CalComError):
    spoken = "That time was just taken. Let me find you another time."


class BookingLimitError(CalComError):
    spoken = (
        "Nathan's calendar for phone calls is already full for that day or week. "
        "A different day might work."
    )


class BookingWindowError(CalComError):
    spoken = (
        "That time is either too soon or too far out to book. Calls need at "
        "least two hours' notice and have to be within the next two weeks."
    )


class CalendarUnavailableError(CalComError):
    spoken = (
        "I can't reach Nathan's calendar right now. You can book on the "
        f"website at {WEBSITE_FALLBACK}."
    )


# --- data -------------------------------------------------------------------


@dataclass(frozen=True)
class BookingRequest:
    start: dt.datetime  # timezone-aware
    duration_minutes: int
    name: str
    phone_number: str  # E.164, from SIP caller ID only
    time_zone: str  # IANA name
    email: str | None = None
    notes: str | None = None


@dataclass(frozen=True)
class BookingResult:
    uid: str
    start: dt.datetime  # timezone-aware


class Calendar(Protocol):
    """What the agent needs from a calendar. Tests substitute a fake."""

    async def get_slots(
        self, *, start: dt.datetime, end: dt.datetime, duration_minutes: int
    ) -> list[dt.datetime]: ...

    async def create_booking(self, request: BookingRequest) -> BookingResult: ...


# --- payloads ---------------------------------------------------------------


def to_utc_iso(value: dt.datetime) -> str:
    """Cal.com wants UTC instants, e.g. ``2033-09-05T16:00:00Z``."""
    if value.tzinfo is None:
        raise ValueError("datetime must be timezone-aware")
    return value.astimezone(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_booking_payload(request: BookingRequest, *, event_type_id: int) -> dict:
    """Body for ``POST /v2/bookings`` on the phone-only event type.

    The event type's location is "attendee phone": Nathan calls the attendee.
    Its booking fields require a name and ``attendeePhoneNumber``; email and
    notes are optional. ``attendee.phoneNumber`` (E.164) plus the location
    ``{"type": "attendeePhone", "phone": ...}`` satisfies the required phone
    field with no email; this shape was verified against the live API on
    2026-11-05.
    """
    attendee: dict[str, Any] = {
        "name": request.name,
        "timeZone": request.time_zone,
        "phoneNumber": request.phone_number,
    }
    if request.email:
        attendee["email"] = request.email

    payload: dict[str, Any] = {
        "start": to_utc_iso(request.start),
        "eventTypeId": event_type_id,
        "lengthInMinutes": request.duration_minutes,
        "attendee": attendee,
        "location": {"type": "attendeePhone", "phone": request.phone_number},
    }
    if request.notes:
        payload["bookingFieldsResponses"] = {"notes": request.notes}
    return payload


def parse_slots(body: Any) -> list[dt.datetime]:
    """Parse a ``GET /v2/slots`` response into sorted, aware start times.

    The response maps dates to lists of slots. The reference example shows
    each slot as ``{"start": "..."}``; the schema also allows a bare string.
    """
    if not isinstance(body, dict) or not isinstance(body.get("data"), dict):
        raise CalComError("unexpected slots response shape")

    starts: set[dt.datetime] = set()
    for day_slots in body["data"].values():
        if not isinstance(day_slots, list):
            continue
        for slot in day_slots:
            raw = slot.get("start") if isinstance(slot, dict) else slot
            if not isinstance(raw, str):
                continue
            try:
                parsed = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                logger.warning("skipping unparseable slot start %r", raw)
                continue
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=dt.UTC)
            starts.add(parsed.astimezone(dt.UTC))
    return sorted(starts)


def classify_error(status: int, body: Any) -> CalComError:
    """Map a failed Cal.com response to a typed error.

    Cal.com reports failures as ``{"status": "error", "error": {"message":
    ...}}``. The message strings matched here are best guesses from the
    front-desk example and Cal.com's booking errors; they are unverified
    against the live API, and anything unmatched falls back to the generic
    error, which is still safe to say.
    """
    message = ""
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            message = str(error.get("message") or error.get("code") or "")
        elif isinstance(error, str):
            message = error
        message = message or str(body.get("message") or "")
    detail = f"HTTP {status}: {message}" if message else f"HTTP {status}"
    text = message.lower()

    if status in (401, 403) or status == 429 or status >= 500:
        return CalendarUnavailableError(detail, status=status)
    if "limit" in text:
        return BookingLimitError(detail, status=status)
    if any(
        key in text
        for key in (
            "out of bounds",
            "out_of_bounds",
            "minimum notice",
            "too soon",
            "in the past",
            "booking window",
        )
    ):
        return BookingWindowError(detail, status=status)
    if status == 409 or any(
        key in text
        for key in (
            "already has booking",
            "not available",
            "no_available_users",
            "no available users",
            "unavailable",
        )
    ):
        return SlotUnavailableError(detail, status=status)
    return CalComError(detail, status=status)


# --- client -----------------------------------------------------------------


class CalComClient:
    def __init__(
        self,
        *,
        api_key: str,
        event_type_id: int,
        http_session: aiohttp.ClientSession | None = None,
        base_url: str = BASE_URL,
        timeout_seconds: float = REQUEST_TIMEOUT_SECONDS,
    ) -> None:
        self._api_key = api_key
        self._event_type_id = event_type_id
        self._base_url = base_url
        self._timeout = aiohttp.ClientTimeout(total=timeout_seconds)
        self._session = http_session
        self._owns_session = False

    def _headers(self, api_version: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "cal-api-version": api_version,
            "User-Agent": USER_AGENT,
        }

    def _http(self) -> aiohttp.ClientSession:
        if self._session is None:
            try:
                # The job-scoped shared session, closed when the job ends.
                from livekit.agents.utils import http_context

                self._session = http_context.http_session()
            except RuntimeError:
                # Outside a job (tests, scripts): own a session.
                self._session = aiohttp.ClientSession()
                self._owns_session = True
        return self._session

    async def aclose(self) -> None:
        if self._owns_session and self._session is not None:
            await self._session.close()
            self._session = None
            self._owns_session = False

    async def _request(
        self,
        method: str,
        path: str,
        *,
        api_version: str,
        params: dict[str, str] | None = None,
        json: dict | None = None,
    ) -> Any:
        url = self._base_url + path
        try:
            async with self._http().request(
                method,
                url,
                params=params,
                json=json,
                headers=self._headers(api_version),
                timeout=self._timeout,
            ) as resp:
                try:
                    body = await resp.json(content_type=None)
                except (aiohttp.ContentTypeError, ValueError):
                    body = None
                failed = resp.status >= 400 or (
                    isinstance(body, dict) and body.get("status") == "error"
                )
                if failed:
                    error = classify_error(resp.status, body)
                    logger.warning("cal.com %s %s failed: %s", method, path, error)
                    raise error
                return body
        except CalComError:
            raise
        except (aiohttp.ClientError, TimeoutError) as exc:
            logger.warning("cal.com %s %s unreachable: %r", method, path, exc)
            raise CalendarUnavailableError(f"request failed: {exc!r}") from exc

    async def get_slots(
        self, *, start: dt.datetime, end: dt.datetime, duration_minutes: int
    ) -> list[dt.datetime]:
        body = await self._request(
            "GET",
            "slots",
            api_version=SLOTS_API_VERSION,
            params={
                "eventTypeId": str(self._event_type_id),
                "start": to_utc_iso(start),
                "end": to_utc_iso(end),
                "duration": str(duration_minutes),
                "timeZone": "UTC",
            },
        )
        return parse_slots(body)

    async def create_booking(self, request: BookingRequest) -> BookingResult:
        body = await self._request(
            "POST",
            "bookings",
            api_version=BOOKINGS_API_VERSION,
            json=build_booking_payload(request, event_type_id=self._event_type_id),
        )
        data = body.get("data") if isinstance(body, dict) else None
        if isinstance(data, list):  # recurring event types return a list
            data = data[0] if data else None
        if not isinstance(data, dict) or not data.get("uid"):
            raise CalComError("booking response had no booking uid")

        start = request.start
        if isinstance(data.get("start"), str):
            with contextlib.suppress(ValueError):
                start = dt.datetime.fromisoformat(data["start"].replace("Z", "+00:00"))
        logger.info("cal.com booking created: uid=%s", data["uid"])
        return BookingResult(uid=str(data["uid"]), start=start)
