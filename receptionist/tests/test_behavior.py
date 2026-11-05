"""Behavior tests: the real agent and model, judged by an LLM.

These call LiveKit Inference, so they need LIVEKIT_API_KEY and
LIVEKIT_API_SECRET and skip without them (as in CI). Cal.com is replaced by
a fake calendar, so nothing is ever booked for real.

Run them with: uv run pytest -m behavior
"""

from __future__ import annotations

import datetime as dt
import os
import textwrap

import pytest
from fakes import (
    CALLER_PHONE,
    PACIFIC,
    FakeCalendar,
    wait_for_greeting,
    weekday_slots,
)
from livekit.agents import AgentSession, inference, llm

from agent import Receptionist
from booking import BookingDesk

pytestmark = [
    pytest.mark.behavior,
    pytest.mark.skipif(
        not (
            os.environ.get("LIVEKIT_API_KEY") and os.environ.get("LIVEKIT_API_SECRET")
        ),
        reason="needs LiveKit Inference credentials (LIVEKIT_API_KEY/SECRET)",
    ),
]

JUDGE_MODEL = "openai/gpt-4.1-mini"

ASK = "Hi, I'd like to book a 30 minute call with Nathan. What's the soonest you have?"
PICK = (
    "The first time you mentioned works. My name is Alex Rivera. "
    "No topic, and I don't need a calendar invite."
)


def _judge() -> llm.LLM:
    return inference.LLM(model=JUDGE_MODEL)


def _desk(caller_phone: str | None) -> tuple[BookingDesk, FakeCalendar]:
    now = dt.datetime.now(PACIFIC)
    calendar = FakeCalendar(weekday_slots(now))
    desk = BookingDesk(calendar=calendar, owner_tz=PACIFIC, caller_phone=caller_phone)
    return desk, calendar


def _called(result, name: str) -> bool:
    return any(
        event.type == "function_call" and event.item.name == name
        for event in result.events
    )


def _last_reply(result):
    return result.expect[-1].is_message(role="assistant")


async def _start(session: AgentSession, desk: BookingDesk) -> None:
    await session.start(Receptionist(owner_tz=desk.owner_tz, today=desk.now().date()))
    await wait_for_greeting(session)


async def test_reads_back_before_booking() -> None:
    desk, calendar = _desk(CALLER_PHONE)
    async with _judge() as judge, AgentSession[BookingDesk](userdata=desk) as session:
        await _start(session, desk)

        result = await session.run(user_input=ASK)
        assert _called(result, "list_available_slots")

        result = await session.run(user_input=PICK)
        assert not _called(result, "book_call")
        assert calendar.bookings == []
        await _last_reply(result).judge(
            judge,
            intent=textwrap.dedent(
                """\
                Reads a booking back to the caller before making it: a specific day,
                a time with a time zone, a 30-minute length, and the name Alex
                Rivera. Asks the caller to confirm. Does not say the call is
                already booked.
                """
            ),
        )

        result = await session.run(user_input="Yes, that's right, go ahead.")
        assert _called(result, "book_call")
        (request,) = calendar.bookings
        assert request.phone_number == CALLER_PHONE
        assert request.name == "Alex Rivera"
        assert request.email is None


async def test_no_never_books() -> None:
    desk, calendar = _desk(CALLER_PHONE)
    async with _judge() as judge, AgentSession[BookingDesk](userdata=desk) as session:
        await _start(session, desk)
        await session.run(user_input=ASK)
        await session.run(user_input=PICK)

        result = await session.run(user_input="No, don't book that.")
        assert not _called(result, "book_call")
        assert calendar.bookings == []
        await _last_reply(result).judge(
            judge,
            intent=(
                "Acknowledges that the caller does not want that booking and does "
                "not claim anything was booked. It may offer other times."
            ),
        )


async def test_withheld_caller_id_never_books() -> None:
    desk, calendar = _desk(None)
    async with _judge() as judge, AgentSession[BookingDesk](userdata=desk) as session:
        await _start(session, desk)
        await session.run(user_input=ASK)
        await session.run(user_input=PICK)

        result = await session.run(user_input="Yes, please book it.")
        assert calendar.bookings == []
        await _last_reply(result).judge(
            judge,
            intent=(
                "Says it can't book the call over the phone because there is no "
                "caller ID or number to call back, and suggests booking on Nathan's "
                "website. Does not claim the call was booked."
            ),
        )
