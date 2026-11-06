"""Anonymous call analytics (#1573): what is sent, what never is, and that
analytics can never break a call."""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import uuid

import posthog
import pytest
from fakes import CALLER_PHONE, PACIFIC, FakeCalendar, fixed_clock, weekday_slots
from livekit.agents import ToolError

from analytics import (
    AGENT_USER_AGENT,
    EVENT_PROPERTIES,
    CallAnalytics,
    PostHogSink,
    failure_reason,
)
from booking import BookingDesk, BookingDetails
from calcom import (
    BookingLimitError,
    BookingOutcomeUnknownError,
    BookingWindowError,
    CalComError,
    CalendarUnavailableError,
    EmailRejectedError,
    SlotUnavailableError,
)

NOW = dt.datetime(2026, 11, 9, 9, 0, tzinfo=PACIFIC)  # a Monday
NAME = "Jordan Example"
NOTES = "the platform roadmap"
EMAIL = "jordan@example.com"


def own(props: dict) -> dict:
    """An event's own properties, without PostHog's ``$`` markers."""
    return {k: v for k, v in props.items() if not k.startswith("$")}


class FakeSink:
    """Records captures; can be told to fail."""

    def __init__(self, *, fail: bool = False) -> None:
        self.events: list[tuple[str, str, dict]] = []
        self.flushed = 0
        self.fail = fail

    def capture(self, event: str, *, distinct_id: str, properties: dict) -> None:
        if self.fail:
            raise RuntimeError("posthog is down")
        self.events.append((event, distinct_id, properties))

    def flush(self, timeout_seconds: float) -> None:
        if self.fail:
            raise RuntimeError("posthog is down")
        self.flushed += 1

    def names(self) -> list[str]:
        return [name for name, _, _ in self.events]

    def props(self, name: str) -> dict:
        matches = [own(p) for n, _, p in self.events if n == name]
        assert len(matches) == 1, f"{name}: {len(matches)} events"
        return matches[0]


class Ticker:
    def __init__(self) -> None:
        self.now = 100.0

    def __call__(self) -> float:
        return self.now


def make_desk(sink: FakeSink, **calendar_kwargs) -> BookingDesk:
    calendar = FakeCalendar(weekday_slots(NOW), **calendar_kwargs)
    return BookingDesk(
        calendar=calendar,
        owner_tz=PACIFIC,
        caller_phone=CALLER_PHONE,
        clock=fixed_clock(NOW),
        analytics=CallAnalytics(sink),
    )


class _Msg:
    def __init__(self, role: str, *, interrupted: bool = False) -> None:
        self.type = "message"
        self.role = role
        self.interrupted = interrupted


class _Call:
    def __init__(self, call_id: str) -> None:
        self.type = "function_call"
        self.call_id = call_id


AGREED = [_Call("review-1"), _Msg("assistant"), _Msg("user")]


async def book(desk: BookingDesk, *, email: str | None = None) -> str:
    await desk.list_slots(duration_minutes=30)
    if email:
        desk.set_email(email)
    details = BookingDetails("slot-1", 30, NAME, NOTES, desk.email)
    desk.review_booking(details, call_id="review-1")
    desk.check_approval(details, history=AGREED)
    return await desk.commit(details)


# --- the event contract --------------------------------------------------------


def test_every_event_name_is_snake_case_and_prefixed() -> None:
    for name in EVENT_PROPERTIES:
        assert name.startswith("receptionist_")
        assert name == name.lower()


async def test_a_booked_call_sends_each_event_once_with_exactly_its_properties() -> (
    None
):
    sink = FakeSink()
    desk = make_desk(sink)
    desk.analytics.call_started(caller_id_present=True)
    await book(desk, email=EMAIL)
    desk.analytics.call_ended(booked=desk.booking is not None, ended_by="caller")

    assert sink.names() == [
        "receptionist_call_started",
        "receptionist_slots_offered",
        "receptionist_booking_reviewed",
        "receptionist_booking_created",
        "receptionist_call_ended",
    ]
    for name, _, props in sink.events:
        assert set(own(props)) == {"call_id", *EVENT_PROPERTIES[name]}, name
        assert props["$raw_user_agent"] == AGENT_USER_AGENT
        assert props["$geoip_disable"] is True
    assert sink.props("receptionist_call_started")["caller_id_present"] is True
    assert sink.props("receptionist_slots_offered") | {"call_id": None} == {
        "call_id": None,
        "duration_minutes": 30,
        "slot_count": 3,
        "day_requested": False,
    }
    assert sink.props("receptionist_booking_reviewed")["invite_requested"] is True
    created = sink.props("receptionist_booking_created")
    assert created["duration_minutes"] == 30
    assert created["invite_requested"] is True
    assert created["email_kept"] is True
    ended = sink.props("receptionist_call_ended")
    assert ended["booked"] is True
    assert ended["ended_by"] == "caller"


async def test_one_random_call_id_is_the_distinct_id_on_every_event() -> None:
    sink = FakeSink()
    desk = make_desk(sink)
    desk.analytics.call_started(caller_id_present=True)
    await book(desk)
    desk.analytics.call_ended(booked=True, ended_by="agent")

    ids = {distinct_id for _, distinct_id, _ in sink.events}
    call_ids = {props["call_id"] for _, _, props in sink.events}
    assert ids == call_ids
    assert len(ids) == 1
    (call_id,) = ids
    assert uuid.UUID(call_id).version == 4
    # A new call gets a new id: nothing ties two calls from one caller together.
    assert CallAnalytics(FakeSink()).call_id != call_id


async def test_no_event_ever_carries_the_callers_details() -> None:
    sink = FakeSink()
    desk = make_desk(sink)
    desk.analytics.call_started(caller_id_present=True)
    await desk.list_slots(duration_minutes=30, caller_timezone="America/New_York")
    await book(desk, email=EMAIL)
    desk.analytics.call_ended(booked=True, ended_by="caller")

    sent = json.dumps([[n, d, p] for n, d, p in sink.events])
    digits = CALLER_PHONE.lstrip("+")
    for secret in (
        CALLER_PHONE,
        digits,
        digits[-10:],
        digits[-4:],
        NAME,
        "Jordan",
        NOTES,
        EMAIL,
        "example.com",
        "America/New_York",
        "fake-1",  # the Cal.com booking uid
    ):
        assert secret not in sent, secret
    # Known positive: the same search finds what is meant to be there.
    assert "receptionist_booking_created" in sent


async def test_a_call_with_no_caller_id_reports_it() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=False)
    assert sink.props("receptionist_call_started") | {"call_id": None} == {
        "call_id": None,
        "caller_id_present": False,
    }


async def test_slots_offered_reports_a_requested_day_and_skips_empty_results() -> None:
    sink = FakeSink()
    desk = make_desk(sink)
    await desk.list_slots(duration_minutes=15, day="2026-11-10")
    assert sink.props("receptionist_slots_offered")["day_requested"] is True
    assert sink.props("receptionist_slots_offered")["duration_minutes"] == 15
    # Saturday has no open times: nothing was offered, so nothing is sent.
    await desk.list_slots(duration_minutes=15, day="2026-11-14")
    assert sink.names().count("receptionist_slots_offered") == 1


async def test_a_booking_without_an_invite_reports_email_kept_as_null() -> None:
    sink = FakeSink()
    desk = make_desk(sink)
    await book(desk)
    created = sink.props("receptionist_booking_created")
    assert created["invite_requested"] is False
    assert created["email_kept"] is None


async def test_a_dropped_invite_reports_email_kept_false() -> None:
    sink = FakeSink()
    desk = make_desk(sink, email_kept=False)
    await book(desk, email=EMAIL)
    assert sink.props("receptionist_booking_created")["email_kept"] is False


@pytest.mark.parametrize(
    ("error", "reason"),
    [
        (SlotUnavailableError("test"), "slot_taken"),
        (BookingLimitError("test"), "limit"),
        (BookingWindowError("test"), "window"),
        (EmailRejectedError("test"), "email_rejected"),
        (BookingOutcomeUnknownError("test"), "unconfirmed"),
        (CalendarUnavailableError("test"), "unavailable"),
        (CalComError("test"), "other"),
    ],
)
async def test_a_failed_booking_reports_only_the_reason(
    error: CalComError, reason: str
) -> None:
    sink = FakeSink()
    desk = make_desk(sink, booking_error=error)
    with pytest.raises(ToolError):
        await book(desk, email=EMAIL)
    assert sink.props("receptionist_booking_failed") | {"call_id": None} == {
        "call_id": None,
        "reason": reason,
    }
    assert "receptionist_booking_created" not in sink.names()


def test_failure_reason_covers_every_calcom_error() -> None:
    assert failure_reason(SlotUnavailableError("test")) == "slot_taken"
    assert failure_reason(CalComError("test")) == "other"


async def test_a_guard_refusal_is_not_a_failed_booking() -> None:
    # book_call refusing an unreviewed booking is the model being corrected,
    # not Cal.com failing, so it isn't counted as a failed booking.
    sink = FakeSink()
    desk = make_desk(sink)
    await desk.list_slots(duration_minutes=30)
    details = BookingDetails("slot-1", 30, NAME)
    with pytest.raises(ToolError):
        desk.check_approval(details, history=[])
    assert "receptionist_booking_failed" not in sink.names()


# --- call end --------------------------------------------------------------------


def test_call_ended_reports_whole_seconds_and_is_sent_once() -> None:
    sink = FakeSink()
    clock = Ticker()
    analytics = CallAnalytics(sink, clock=clock)
    analytics.call_started(caller_id_present=True)
    clock.now += 83.6
    analytics.call_ended(booked=False, ended_by="cap")
    clock.now += 5
    analytics.call_ended(booked=True, ended_by="caller")

    assert sink.names().count("receptionist_call_ended") == 1
    ended = sink.props("receptionist_call_ended")
    assert ended["duration_seconds"] == 84
    assert ended["booked"] is False
    assert ended["ended_by"] == "cap"


def test_an_unknown_end_reason_is_reported_as_other() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=True)
    analytics.call_ended(booked=False, ended_by="the caller's name")
    assert sink.props("receptionist_call_ended")["ended_by"] == "other"


# --- the allowlist ----------------------------------------------------------------


def test_an_unlisted_property_or_event_is_dropped_not_sent() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.capture("receptionist_call_started", caller_id_present=True, phone="x")
    analytics.capture("receptionist_something_else", caller_id_present=True)
    analytics.capture("receptionist_call_started", caller_id_present="yes")
    analytics.capture("receptionist_booking_failed", reason=NAME)
    assert sink.events == []


def test_a_bool_is_not_accepted_as_an_int() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.capture(
        "receptionist_slots_offered",
        duration_minutes=True,
        slot_count=3,
        day_requested=False,
    )
    assert sink.events == []


# --- owner test calls ---------------------------------------------------------------


def test_an_owner_test_call_is_flagged_internal_without_the_number() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink, internal=True)
    analytics.call_started(caller_id_present=True)
    _, _, props = sink.events[0]
    # The project's internal cohort matches a person property, so an owner
    # call makes a person whose only property is the flag.
    assert props["$set"] == {"$internal_or_test_user": True}
    assert props["$process_person_profile"] is True
    assert CALLER_PHONE not in json.dumps(props)


def test_a_public_call_makes_no_person() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=True)
    _, _, props = sink.events[0]
    assert props["$process_person_profile"] is False
    assert "$set" not in props


# --- failure isolation -----------------------------------------------------------


async def test_analytics_failures_never_break_a_booking() -> None:
    sink = FakeSink(fail=True)
    desk = make_desk(sink)
    desk.analytics.call_started(caller_id_present=True)
    said = await book(desk, email=EMAIL)
    assert said.startswith("Booked.")
    assert desk.booking is not None
    desk.analytics.call_ended(booked=True, ended_by="caller")
    await desk.analytics.aclose()


async def test_a_disabled_analytics_sends_nothing_and_books_normally() -> None:
    desk = BookingDesk(
        calendar=FakeCalendar(weekday_slots(NOW)),
        owner_tz=PACIFIC,
        caller_phone=CALLER_PHONE,
        clock=fixed_clock(NOW),
    )
    assert desk.analytics.enabled is False
    said = await book(desk)
    assert said.startswith("Booked.")
    await desk.analytics.aclose()


async def test_close_flushes_once() -> None:
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=True)
    await analytics.aclose()
    await analytics.aclose()
    assert sink.flushed == 1


async def test_the_call_ending_starts_the_final_send_at_once() -> None:
    # The job process can exit soon after the call ends, so the last events
    # mustn't wait for a shutdown callback to be sent.
    sink = FakeSink()
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=True)
    analytics.call_ended(booked=False, ended_by="caller")
    await asyncio.sleep(0.05)
    assert sink.flushed == 1
    await analytics.aclose()
    assert sink.flushed == 1


# --- the real SDK, end to end up to the wire --------------------------------------


def test_the_wire_event_carries_only_the_allowlist() -> None:
    """Run the real posthog client (sending disabled) and read the final
    message after the SDK's own enrichment."""
    wire: list[dict] = []
    sink = PostHogSink(
        "phc_test_token",
        host="http://127.0.0.1:9",
        _send=False,
        _observe=wire.append,
    )
    analytics = CallAnalytics(sink)
    analytics.call_started(caller_id_present=True)
    assert len(wire) == 1
    msg = wire[0]
    assert msg["event"] == "receptionist_call_started"
    assert msg["distinct_id"] == analytics.call_id
    props = msg["properties"]
    assert props["caller_id_present"] is True
    assert props["call_id"] == analytics.call_id
    assert props["$process_person_profile"] is False
    assert props["$geoip_disable"] is True
    assert props["$raw_user_agent"] == AGENT_USER_AGENT
    # The SDK's own system context (the server's OS and Python) is stripped.
    assert not any(key.startswith(("$python", "$os")) for key in props)
    assert set(props) <= {
        "caller_id_present",
        "call_id",
        "$process_person_profile",
        "$geoip_disable",
        "$raw_user_agent",
        "$lib",
        "$lib_version",
        "$is_server",
    }
    sink.flush(0.1)


def test_the_sdk_version_is_pinned_to_a_capture_signature_we_use() -> None:
    # posthog 6+ takes the event first and distinct_id as a keyword.
    assert int(posthog.VERSION.split(".")[0]) >= 6
