"""The rules behind the tools: offered slots, caller ID, review, one booking."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from zoneinfo import ZoneInfo

import pytest
from fakes import (
    CALLER_PHONE,
    OTHER_PHONE,
    PACIFIC,
    FakeCalendar,
    fixed_clock,
    weekday_slots,
)
from livekit.agents import ToolError

from booking import (
    MAX_OFFERED_SLOTS,
    BookingDesk,
    BookingDetails,
    normalize_phone,
    pick_spread,
    speak_clock,
    speak_when,
    user_replied_after,
)
from calcom import (
    BookingLimitError,
    BookingOutcomeUnknownError,
    EmailRejectedError,
    SlotUnavailableError,
)

# Thursday, September 1, 2033, noon Pacific.
NOW = dt.datetime(2033, 9, 1, 12, 0, tzinfo=PACIFIC)


@dataclass
class Item:
    """Minimal stand-in for a chat history item."""

    type: str
    role: str | None = None
    call_id: str | None = None
    interrupted: bool = False


def make_desk(
    *, caller_phone: str | None = CALLER_PHONE, calendar: FakeCalendar | None = None
) -> tuple[BookingDesk, FakeCalendar]:
    calendar = calendar or FakeCalendar(weekday_slots(NOW))
    desk = BookingDesk(
        calendar=calendar,
        owner_tz=PACIFIC,
        caller_phone=caller_phone,
        clock=fixed_clock(NOW),
    )
    return desk, calendar


def details(slot: str = "slot-1", **overrides) -> BookingDetails:
    values = {"slot": slot, "duration_minutes": 30, "name": "Alex Example"}
    values.update(overrides)
    return BookingDetails(**values)


def answered(call_id: str = "review-1") -> list[Item]:
    """History in which the caller spoke after the review call."""
    return [
        Item("message", role="user"),
        Item("function_call", call_id=call_id),
        Item("function_call_output", call_id=call_id),
        Item("message", role="assistant"),
        Item("message", role="user"),
    ]


async def offered_desk(**kwargs) -> tuple[BookingDesk, FakeCalendar]:
    desk, calendar = make_desk(**kwargs)
    await desk.list_slots(duration_minutes=30)
    return desk, calendar


async def book(desk: BookingDesk, d: BookingDetails, call_id: str = "review-1") -> str:
    desk.review_booking(d, call_id=call_id)
    desk.check_approval(d, history=answered(call_id))
    return await desk.commit(d)


# --- formatting -------------------------------------------------------------


def test_speech_formatting():
    assert speak_clock(dt.datetime(2033, 9, 2, 10, 0)) == "10 AM"
    assert speak_clock(dt.datetime(2033, 9, 2, 14, 30)) == "2:30 PM"
    assert speak_clock(dt.datetime(2033, 9, 2, 0, 15)) == "12:15 AM"
    assert (
        speak_when(dt.datetime(2033, 9, 2, 17, 0, tzinfo=dt.UTC), PACIFIC)
        == "Friday, September 2 at 10 AM Pacific time"
    )
    assert (
        speak_when(
            dt.datetime(2033, 9, 2, 17, 0, tzinfo=dt.UTC), ZoneInfo("Europe/Berlin")
        )
        == "Friday, September 2 at 7 PM Berlin time"
    )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("+15555550123", "+15555550123"),
        ("tel:+15555550123", "+15555550123"),
        (" +15555550123 ", "+15555550123"),
        ("", None),
        (None, None),
        ("anonymous", None),
        ("5555550123", None),
        ("+1555", None),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_pick_spread_takes_one_per_day_then_spreads_within_a_day():
    slots = weekday_slots(NOW)
    picks = pick_spread(slots, tz=PACIFIC, one_day=False, limit=3)
    assert [p.date() for p in picks] == [
        dt.date(2033, 9, 2),
        dt.date(2033, 9, 5),
        dt.date(2033, 9, 6),
    ]
    day = [dt.datetime(2033, 9, 2, h, tzinfo=PACIFIC) for h in range(9, 17)]
    spread = pick_spread(day, tz=PACIFIC, one_day=True, limit=3)
    assert [p.hour for p in spread] == [9, 13, 16]


# --- list_available_slots ---------------------------------------------------


async def test_list_offers_at_most_three_slots_in_pacific_time():
    desk, calendar = make_desk()
    text = await desk.list_slots(duration_minutes=30)

    lines = text.splitlines()
    slot_lines = [line for line in lines if line.startswith("slot-")]
    assert len(slot_lines) == MAX_OFFERED_SLOTS == 3
    assert slot_lines[0] == "slot-1: Friday, September 2 at 10 AM Pacific time"
    assert len(desk.offered) == 3

    start, end, duration = calendar.slot_queries[0]
    assert duration == 30
    assert start == NOW
    assert end == NOW + dt.timedelta(days=14)


async def test_list_adds_callers_zone_when_given():
    desk, _ = make_desk()
    text = await desk.list_slots(
        duration_minutes=15, caller_timezone="America/New_York"
    )
    assert (
        "slot-1: Friday, September 2 at 10 AM Pacific time "
        "(Friday, September 2 at 1 PM Eastern time for the caller)"
    ) in text


async def test_list_for_a_specific_day_queries_that_day_only():
    desk, calendar = make_desk()
    text = await desk.list_slots(duration_minutes=30, day="2033-09-06")
    start, end, _ = calendar.slot_queries[0]
    assert start == dt.datetime(2033, 9, 6, tzinfo=PACIFIC)
    assert end == dt.datetime(2033, 9, 7, tzinfo=PACIFIC)
    assert "Tuesday, September 6 at 10 AM" in text
    assert "Tuesday, September 6 at 2 PM" in text


async def test_list_outside_window_returns_fact_without_query():
    desk, calendar = make_desk()
    text = await desk.list_slots(duration_minutes=30, day="2033-10-30")
    assert "outside the booking window" in text
    assert calendar.slot_queries == []


async def test_list_with_no_openings():
    desk, _ = make_desk(calendar=FakeCalendar([]))
    text = await desk.list_slots(duration_minutes=30)
    assert text == "No open 30-minute times in the next 14 days."
    assert desk.offered == {}


@pytest.mark.parametrize(
    "kwargs",
    [
        {"duration_minutes": 45},
        {"duration_minutes": 30, "day": "next tuesday"},
        {"duration_minutes": 30, "caller_timezone": "Eastern"},
    ],
)
async def test_list_rejects_malformed_arguments(kwargs):
    desk, _ = make_desk()
    with pytest.raises(ToolError):
        await desk.list_slots(**kwargs)


async def test_relisting_keeps_slot_labels_stable():
    desk, _ = make_desk()
    await desk.list_slots(duration_minutes=30)
    first = dict(desk.offered)
    await desk.list_slots(duration_minutes=30)
    assert desk.offered == first


async def test_labels_never_reuse_a_removed_slots_label():
    # Losing slot-1 to another booker must not free "slot-1"'s number for a
    # different time, or let a relisting overwrite slot-3 (Codex, #1568).
    calendar = FakeCalendar(
        weekday_slots(NOW), booking_error=SlotUnavailableError("HTTP 400: taken")
    )
    desk, _ = await offered_desk(calendar=calendar)
    before = {ref: slot.start for ref, slot in desk.offered.items()}
    assert sorted(before) == ["slot-1", "slot-2", "slot-3"]
    with pytest.raises(ToolError):
        await book(desk, details())
    assert "slot-1" not in desk.offered

    await desk.list_slots(duration_minutes=30)
    for ref in ("slot-2", "slot-3"):
        assert desk.offered[ref].start == before[ref]
    relabelled = [r for r, s in desk.offered.items() if s.start == before["slot-1"]]
    assert relabelled == ["slot-4"]
    starts = [slot.start for slot in desk.offered.values()]
    assert len(starts) == len(set(starts))


# --- guards -----------------------------------------------------------------


async def test_unoffered_slot_is_refused():
    desk, calendar = await offered_desk()
    with pytest.raises(ToolError, match="isn't a time offered"):
        desk.review_booking(details("slot-9"), call_id="review-1")
    with pytest.raises(ToolError, match="isn't a time offered"):
        await desk.commit(details("slot-9"))
    assert calendar.bookings == []


async def test_nothing_is_offered_before_listing():
    desk, calendar = make_desk()
    with pytest.raises(ToolError):
        desk.review_booking(details(), call_id="review-1")
    assert calendar.bookings == []


async def test_duration_must_match_the_offer():
    desk, _ = await offered_desk()
    with pytest.raises(ToolError, match="30-minute"):
        desk.review_booking(details(duration_minutes=15), call_id="review-1")


@pytest.mark.parametrize("caller_phone", [None, "", "anonymous"])
async def test_missing_caller_id_lists_but_never_books(caller_phone):
    desk, calendar = make_desk(caller_phone=caller_phone)
    text = await desk.list_slots(duration_minutes=30)
    assert "slot-1" in text
    assert "no caller ID" in text

    with pytest.raises(ToolError, match="no caller ID"):
        desk.review_booking(details(), call_id="review-1")
    with pytest.raises(ToolError, match="no caller ID"):
        desk.check_approval(details(), history=answered())
    with pytest.raises(ToolError, match="no caller ID"):
        await desk.commit(details())
    assert calendar.bookings == []


async def test_booking_requires_review():
    desk, calendar = await offered_desk()
    with pytest.raises(ToolError, match="review_booking first"):
        desk.check_approval(details(), history=answered())
    assert calendar.bookings == []


async def test_booking_requires_a_caller_reply_after_the_review():
    desk, _ = await offered_desk()
    desk.review_booking(details(), call_id="review-1")
    same_turn = [
        Item("message", role="user"),
        Item("function_call", call_id="review-1"),
        Item("function_call_output", call_id="review-1"),
        Item("message", role="assistant"),
    ]
    with pytest.raises(ToolError, match="hasn't answered"):
        desk.check_approval(details(), history=same_turn)


async def test_changed_details_need_a_new_review():
    desk, _ = await offered_desk()
    desk.review_booking(details(), call_id="review-1")
    with pytest.raises(ToolError, match="differ"):
        desk.check_approval(details(name="Sam Example"), history=answered())
    with pytest.raises(ToolError, match="differ"):
        desk.check_approval(details("slot-2"), history=answered())
    # Whitespace and case are not changes.
    desk.check_approval(details(name="  alex   example "), history=answered())


def test_user_replied_after():
    assert user_replied_after(answered("c1"), "c1")
    assert not user_replied_after(answered("c1"), "other")
    assert not user_replied_after([Item("function_call", call_id="c1")], "c1")
    # A user message before the review doesn't count.
    assert not user_replied_after(
        [Item("message", role="user"), Item("function_call", call_id="c1")], "c1"
    )


def test_reply_must_follow_a_complete_read_back():
    # CodeRabbit, #1568: the caller can speak while the read-back is still
    # playing or cut it off, so only a reply after a finished read-back counts.
    call = Item("function_call", call_id="c1")
    output = Item("function_call_output", call_id="c1")
    read_back = Item("message", role="assistant")
    cut_off = Item("message", role="assistant", interrupted=True)
    caller = Item("message", role="user")

    # The caller spoke before the read-back was in the history.
    assert not user_replied_after([call, output, caller, read_back], "c1")
    # The read-back was interrupted, so the reply that cut it off doesn't count.
    assert not user_replied_after([call, output, cut_off, caller], "c1")
    # A complete read-back, then an interrupted one, then a reply: the latest
    # read-back wasn't heard in full.
    assert not user_replied_after([call, output, read_back, cut_off, caller], "c1")
    # Interrupted, then read back in full, then answered: that counts.
    assert user_replied_after([call, output, cut_off, read_back, caller], "c1")


async def test_review_reads_back_everything_with_caller_id_digits_only():
    desk, _ = await offered_desk()
    text = desk.review_booking(
        details(notes="LiveKit role", email="Alex@Example.com"), call_id="review-1"
    )
    assert "Friday, September 2 at 10 AM Pacific time" in text
    assert "30 minutes" in text
    assert "Alex Example" in text
    assert "0 1 2 3" in text
    assert CALLER_PHONE not in text
    assert "alex@example.com" in text
    assert "LiveKit role" in text


async def test_review_rejects_incomplete_email():
    desk, _ = await offered_desk()
    with pytest.raises(ToolError, match="email"):
        desk.review_booking(details(email="alex at example"), call_id="review-1")


# --- commit -----------------------------------------------------------------


async def test_booking_uses_caller_id_and_offered_slot():
    desk, calendar = await offered_desk()
    confirmation = await book(desk, details())

    (request,) = calendar.bookings
    assert request.phone_number == CALLER_PHONE
    assert request.start == dt.datetime(2033, 9, 2, 10, 0, tzinfo=PACIFIC)
    assert request.duration_minutes == 30
    assert request.name == "Alex Example"
    assert request.email is None
    assert request.notes is None
    assert request.time_zone == "America/Los_Angeles"
    assert "Booked" in confirmation
    assert "No calendar invite" in confirmation


async def test_booking_uses_callers_time_zone_when_known():
    desk, calendar = make_desk()
    await desk.list_slots(duration_minutes=30, caller_timezone="America/Chicago")
    await book(desk, details(email="alex@example.com"))
    (request,) = calendar.bookings
    assert request.time_zone == "America/Chicago"
    assert request.email == "alex@example.com"


async def test_caller_id_cannot_be_replaced_by_model_supplied_numbers():
    desk, calendar = await offered_desk()
    # Even a name or note that carries another number never changes the
    # number Nathan calls.
    await book(desk, details(notes=f"call me at {OTHER_PHONE} instead"))
    (request,) = calendar.bookings
    assert request.phone_number == CALLER_PHONE


async def test_second_booking_is_refused():
    desk, calendar = await offered_desk()
    await book(desk, details("slot-1"))
    with pytest.raises(ToolError, match="already booked"):
        desk.review_booking(details("slot-2"), call_id="review-2")
    with pytest.raises(ToolError, match="already booked"):
        await desk.commit(details("slot-2"))
    assert len(calendar.bookings) == 1


async def test_concurrent_commits_book_once():
    import asyncio

    desk, calendar = await offered_desk()
    desk.review_booking(details(), call_id="review-1")
    results = await asyncio.gather(
        desk.commit(details()), desk.commit(details()), return_exceptions=True
    )
    assert len(calendar.bookings) == 1
    assert sum(isinstance(r, ToolError) for r in results) == 1


async def test_cal_errors_become_speakable_tool_errors():
    calendar = FakeCalendar(
        weekday_slots(NOW), booking_error=SlotUnavailableError("HTTP 400: taken")
    )
    desk, _ = await offered_desk(calendar=calendar)
    with pytest.raises(ToolError) as caught:
        await book(desk, details())
    assert caught.value.message == SlotUnavailableError.spoken
    # A taken slot can't be booked again; a fresh listing is needed.
    assert "slot-1" not in desk.offered
    assert desk.booking is None

    calendar.booking_error = BookingLimitError("HTTP 400: booking_limit_reached")
    with pytest.raises(ToolError) as caught:
        await book(desk, details("slot-2"), call_id="review-2")
    assert caught.value.message == BookingLimitError.spoken


async def test_unconfirmed_booking_blocks_further_booking_and_is_reported():
    calendar = FakeCalendar(
        weekday_slots(NOW),
        booking_error=BookingOutcomeUnknownError("write unconfirmed: timeout"),
    )
    desk, _ = await offered_desk(calendar=calendar)
    with pytest.raises(ToolError) as caught:
        await book(desk, details())
    assert caught.value.message == BookingOutcomeUnknownError.spoken
    assert desk.unconfirmed is not None and desk.booking is None

    # Even once Cal.com would accept, the call books nothing else.
    calendar.booking_error = None
    with pytest.raises(ToolError, match="may already have gone through"):
        desk.review_booking(details("slot-2"), call_id="review-2")
    assert calendar.bookings == []
    status = desk.status_for_goodbye()
    assert "not confirmed" in status and "Nothing was booked" not in status


async def test_goodbye_status_reports_booking():
    desk, _ = await offered_desk()
    assert "Nothing was booked" in desk.status_for_goodbye()
    await book(desk, details())
    assert "Friday, September 2 at 10 AM Pacific time" in desk.status_for_goodbye()


@pytest.mark.parametrize("name", ["Pacific", "America", "Not/A_Zone", "../etc"])
async def test_bad_caller_timezone_is_a_speakable_tool_error(name):
    # Folder names like "America" raise IsADirectoryError under the tzdata
    # package, not ZoneInfoNotFoundError; the caller must still get a sentence.
    desk, _ = make_desk()
    with pytest.raises(ToolError, match="not a time zone name"):
        await desk.list_slots(duration_minutes=30, caller_timezone=name)


def test_set_email_records_a_confirmed_address_and_resets_review():
    desk, _ = make_desk()
    desk.review = object()  # an earlier review no longer matches
    assert "alex@example.com" in desk.set_email("  Alex@Example.com ")
    assert desk.email == "alex@example.com"
    assert desk.review is None
    with pytest.raises(ToolError, match="doesn't look complete"):
        desk.set_email("alex at example")


async def test_rejected_email_keeps_the_slot_and_allows_booking_without_it():
    # Cal.com, 2026-11-05: HTTP 400 "This email address cannot receive mail."
    # The time is still free, so the caller keeps it; only the invite changes.
    calendar = FakeCalendar(
        weekday_slots(NOW),
        booking_error=EmailRejectedError(
            "HTTP 400: This email address cannot receive mail."
        ),
    )
    desk, _ = await offered_desk(calendar=calendar)
    desk.set_email("alex@exmaple.com")
    with pytest.raises(ToolError, match="collect_email") as caught:
        await book(desk, details(email=desk.email))
    assert EmailRejectedError.spoken in caught.value.message
    assert "slot-1" in desk.offered
    assert desk.email is None and desk.review is None and desk.booking is None

    # Without the invite, the same slot books after a fresh review.
    calendar.booking_error = None
    await book(desk, details(email=desk.email), call_id="review-2")
    assert desk.booking is not None
    assert calendar.bookings[-1].email is None
