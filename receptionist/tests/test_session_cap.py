"""The five-minute cap, run against a fake clock."""

from __future__ import annotations

import asyncio

import pytest

from session_cap import GOODBYE_AFTER_SECONDS, HANG_UP_AFTER_SECONDS, SessionCap


class FakeTime:
    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    def clock(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def test_cap_durations():
    assert GOODBYE_AFTER_SECONDS == 270
    assert HANG_UP_AFTER_SECONDS == 300


async def test_goodbye_at_four_thirty_then_hang_up_at_five():
    time = FakeTime()
    events: list[tuple[str, float]] = []

    async def hang_up() -> None:
        events.append(("hang_up", time.now))

    cap = SessionCap(
        on_goodbye=lambda: events.append(("goodbye", time.now)),
        on_hang_up=hang_up,
        clock=time.clock,
        sleep=time.sleep,
    )
    await cap.start()

    assert events == [("goodbye", 270.0), ("hang_up", 300.0)]


async def test_slow_goodbye_does_not_delay_hang_up():
    time = FakeTime()
    events: list[tuple[str, float]] = []

    async def slow_goodbye() -> None:
        time.now += 20  # the goodbye takes 20 seconds of the remaining 30
        events.append(("goodbye", time.now))

    cap = SessionCap(
        on_goodbye=slow_goodbye,
        on_hang_up=lambda: events.append(("hang_up", time.now)),
        clock=time.clock,
        sleep=time.sleep,
    )
    await cap.start()
    assert events == [("goodbye", 290.0), ("hang_up", 300.0)]


async def test_failed_goodbye_still_hangs_up():
    time = FakeTime()
    hung_up = []

    def broken_goodbye() -> None:
        raise RuntimeError("tts down")

    cap = SessionCap(
        on_goodbye=broken_goodbye,
        on_hang_up=lambda: hung_up.append(time.now),
        clock=time.clock,
        sleep=time.sleep,
    )
    await cap.start()
    assert hung_up == [300.0]


async def test_cancel_stops_the_cap():
    calls = []
    cap = SessionCap(
        on_goodbye=lambda: calls.append("goodbye"),
        on_hang_up=lambda: calls.append("hang_up"),
        goodbye_after=10,
        hang_up_after=20,
    )
    task = cap.start()
    await asyncio.sleep(0)
    cap.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert calls == []


async def test_cancel_during_hang_up_does_not_interrupt_it():
    finished = []
    cap: SessionCap

    async def hang_up() -> None:
        cap.cancel()  # closing the session fires the close handler mid hang-up
        await asyncio.sleep(0)
        finished.append("room deleted")

    cap = SessionCap(
        on_goodbye=lambda: None,
        on_hang_up=hang_up,
        goodbye_after=0,
        hang_up_after=0,
    )
    await cap.start()
    assert finished == ["room deleted"]


async def test_real_timer_fires_in_order():
    calls = []
    cap = SessionCap(
        on_goodbye=lambda: calls.append("goodbye"),
        on_hang_up=lambda: calls.append("hang_up"),
        goodbye_after=0.01,
        hang_up_after=0.02,
    )
    await cap.start()
    assert calls == ["goodbye", "hang_up"]


def test_goodbye_must_precede_hang_up():
    with pytest.raises(ValueError):
        SessionCap(
            on_goodbye=lambda: None,
            on_hang_up=lambda: None,
            goodbye_after=60,
            hang_up_after=30,
        )
