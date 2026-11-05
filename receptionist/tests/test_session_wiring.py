"""Offline AgentSession tests with a scripted LLM.

These run the real agent, tools, and session history with no model calls, so
they prove the guards hold inside the SDK: a booking needs a caller turn after
the read-back, and the phone number comes from caller ID.
"""

from __future__ import annotations

import datetime as dt

from fakes import (
    CALLER_PHONE,
    PACIFIC,
    FakeCalendar,
    fixed_clock,
    wait_for_greeting,
    weekday_slots,
)
from livekit.agents import AgentSession
from scripted_llm import ScriptedLLM, ToolCall

from agent import Receptionist
from booking import BookingDesk
from prompts import GREETING

NOW = dt.datetime(2033, 9, 1, 12, 0, tzinfo=PACIFIC)

LIST = ToolCall("list_available_slots", {"duration_minutes": 30})
DETAILS = {"slot": "slot-1", "duration_minutes": 30, "name": "Alex Example"}
REVIEW = ToolCall("review_booking", DETAILS)
BOOK = ToolCall("book_call", DETAILS)


def make_desk(caller_phone: str | None = CALLER_PHONE):
    calendar = FakeCalendar(weekday_slots(NOW))
    desk = BookingDesk(
        calendar=calendar,
        owner_tz=PACIFIC,
        caller_phone=caller_phone,
        clock=fixed_clock(NOW),
    )
    return desk, calendar


def outputs(result, name: str) -> list:
    call_ids = [
        e.item.call_id
        for e in result.events
        if e.type == "function_call" and e.item.name == name
    ]
    return [
        e.item
        for e in result.events
        if e.type == "function_call_output" and e.item.call_id in call_ids
    ]


async def run_script(steps, turns, *, caller_phone=CALLER_PHONE):
    desk, calendar = make_desk(caller_phone)
    scripted = ScriptedLLM(steps)
    results = []
    async with AgentSession[BookingDesk](userdata=desk) as session:
        await session.start(
            Receptionist(owner_tz=PACIFIC, today=NOW.date(), llm=scripted)
        )
        await wait_for_greeting(session)
        for turn in turns:
            results.append(await session.run(user_input=turn))
        history = session.history.items
    # Every scripted reply was used, so the turns lined up as written.
    assert scripted.remaining == 0
    # The greeting is the first thing the agent says, word for word.
    first = next(item for item in history if item.type == "message")
    assert first.role == "assistant"
    assert first.text_content == GREETING
    return desk, calendar, results


async def test_review_then_yes_books_with_caller_id():
    desk, calendar, results = await run_script(
        [
            LIST,
            "I have Friday at 10 AM. Does that work?",
            REVIEW,
            "Friday at 10 AM Pacific, 30 minutes, for Alex Example. Book it?",
            BOOK,
            "You're booked.",
        ],
        [
            "I'd like a call with Nathan.",
            "Friday at 10 works, I'm Alex Example.",
            "Yes, book it.",
        ],
    )
    assert not any(o.is_error for o in outputs(results[1], "review_booking"))
    (booked,) = outputs(results[2], "book_call")
    assert not booked.is_error
    (request,) = calendar.bookings
    assert request.phone_number == CALLER_PHONE
    assert request.start == dt.datetime(2033, 9, 2, 10, 0, tzinfo=PACIFIC)
    assert desk.booking is not None


async def test_booking_in_the_same_turn_as_the_review_is_refused():
    _, calendar, results = await run_script(
        [LIST, "Friday at 10 AM?", REVIEW, BOOK, "Let me read that back first."],
        ["I'd like a call with Nathan.", "Friday at 10, I'm Alex Example."],
    )
    (refused,) = outputs(results[1], "book_call")
    assert refused.is_error
    assert "hasn't answered" in refused.output
    assert calendar.bookings == []


async def test_withheld_caller_id_never_books_in_session():
    _, calendar, results = await run_script(
        [LIST, "Friday at 10 AM?", REVIEW, "I can't book this call.", BOOK, "Sorry."],
        [
            "I'd like a call with Nathan.",
            "Friday at 10, I'm Alex Example.",
            "Yes, book it.",
        ],
        caller_phone=None,
    )
    (review,) = outputs(results[1], "review_booking")
    assert review.is_error and "no caller ID" in review.output
    (book,) = outputs(results[2], "book_call")
    assert book.is_error and "no caller ID" in book.output
    assert calendar.bookings == []
