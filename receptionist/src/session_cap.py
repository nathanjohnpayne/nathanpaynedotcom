"""The hard cap on call length: a spoken goodbye at 4:30, hang up at 5:00.

The cap keeps every call inside the free plan's monthly minutes. The clock
and sleep are injectable so tests run the whole cap instantly.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
import time
from collections.abc import Awaitable, Callable

logger = logging.getLogger("session-cap")

GOODBYE_AFTER_SECONDS = 4 * 60 + 30
HANG_UP_AFTER_SECONDS = 5 * 60

Callback = Callable[[], Awaitable[None] | None]


class SessionCap:
    def __init__(
        self,
        *,
        on_goodbye: Callback,
        on_hang_up: Callback,
        goodbye_after: float = GOODBYE_AFTER_SECONDS,
        hang_up_after: float = HANG_UP_AFTER_SECONDS,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        if not 0 <= goodbye_after <= hang_up_after:
            raise ValueError("goodbye must come before hang-up")
        self._on_goodbye = on_goodbye
        self._on_hang_up = on_hang_up
        self._goodbye_after = goodbye_after
        self._hang_up_after = hang_up_after
        self._clock = clock
        self._sleep = sleep
        self._task: asyncio.Task[None] | None = None
        self._hanging_up = False
        self.started_at: float | None = None

    def start(self) -> asyncio.Task[None]:
        if self._task is None:
            self.started_at = self._clock()
            self._task = asyncio.create_task(self.run(), name="session-cap")
        return self._task

    def cancel(self) -> None:
        """Stop the cap, e.g. when the call ended on its own.

        Once the hang-up has started it runs to completion: hanging up closes
        the session, and that close must not cancel the room deletion.
        """
        if self._hanging_up:
            return
        if self._task is not None and not self._task.done():
            self._task.cancel()

    def _elapsed(self) -> float:
        assert self.started_at is not None
        return self._clock() - self.started_at

    async def _sleep_until(self, mark: float) -> None:
        remaining = mark - self._elapsed()
        if remaining > 0:
            await self._sleep(remaining)

    async def run(self) -> None:
        if self.started_at is None:
            self.started_at = self._clock()

        await self._sleep_until(self._goodbye_after)
        logger.info("session cap: goodbye at %.0fs", self._elapsed())
        try:
            await _call(self._on_goodbye)
        except Exception:
            # A failed goodbye must never keep the call open past the cap.
            logger.exception("session cap: goodbye failed")

        await self._sleep_until(self._hang_up_after)
        logger.info("session cap: hanging up at %.0fs", self._elapsed())
        self._hanging_up = True
        await _call(self._on_hang_up)


async def _call(callback: Callback) -> None:
    result = callback()
    if inspect.isawaitable(result):
        await result
