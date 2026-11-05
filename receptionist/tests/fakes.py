"""Test doubles shared by the unit and behavior tests."""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import pathlib
from zoneinfo import ZoneInfo

from calcom import BookingRequest, BookingResult, CalComError

FIXTURES = pathlib.Path(__file__).parent / "fixtures"

PACIFIC = ZoneInfo("America/Los_Angeles")

# Numbers in the 555-0100 to 555-0199 block are reserved for fiction.
CALLER_PHONE = "+15555550123"
OTHER_PHONE = "+15555550188"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


def fixed_clock(value: dt.datetime):
    return lambda: value


class FakeCalendar:
    """Stands in for the Cal.com client and records what was asked of it."""

    def __init__(
        self,
        slots: list[dt.datetime] | None = None,
        *,
        booking_error: CalComError | None = None,
    ) -> None:
        self.slots = sorted(slots or [])
        self.booking_error = booking_error
        self.slot_queries: list[tuple[dt.datetime, dt.datetime, int]] = []
        self.bookings: list[BookingRequest] = []

    async def get_slots(
        self, *, start: dt.datetime, end: dt.datetime, duration_minutes: int
    ) -> list[dt.datetime]:
        self.slot_queries.append((start, end, duration_minutes))
        return [s for s in self.slots if start <= s < end]

    async def create_booking(self, request: BookingRequest) -> BookingResult:
        if self.booking_error is not None:
            raise self.booking_error
        self.bookings.append(request)
        return BookingResult(uid=f"fake-{len(self.bookings)}", start=request.start)


def weekday_slots(
    now: dt.datetime, *, days: int = 14, hours: tuple[int, ...] = (10, 14)
) -> list[dt.datetime]:
    """Open times at the given Pacific hours on each weekday after ``now``."""
    local_now = now.astimezone(PACIFIC)
    slots = []
    for offset in range(1, days + 1):
        day = local_now.date() + dt.timedelta(days=offset)
        if day.weekday() >= 5:
            continue
        for hour in hours:
            slots.append(dt.datetime.combine(day, dt.time(hour), PACIFIC))
    return slots


async def wait_for_greeting(session, timeout: float = 10.0) -> None:
    """The greeting runs in on_enter, after start() returns; let it finish."""

    async def greeted() -> None:
        while not any(
            item.type == "message" and item.role == "assistant"
            for item in session.history.items
        ):
            await asyncio.sleep(0.01)

    await asyncio.wait_for(greeted(), timeout)
