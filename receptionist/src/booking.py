"""Per-call booking state and the rules the agent's tools enforce.

The model interprets the conversation; this module owns the state and the
guards. It decides which slots were offered, whether a booking was reviewed
and then agreed to in a later caller turn, which phone number is used (only
the SIP caller ID), and that a call books at most once.

Nothing here talks to LiveKit, so the rules are unit-testable without a
session. ``agent.py`` wraps these methods as function tools.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
import re
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass, replace
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from livekit.agents import ToolError

from calcom import (
    WEBSITE_FALLBACK,
    BookingOutcomeUnknownError,
    BookingRequest,
    BookingResult,
    CalComError,
    Calendar,
    EmailRejectedError,
    SlotUnavailableError,
)

logger = logging.getLogger("booking")

ALLOWED_DURATIONS = (15, 30)
MAX_OFFERED_SLOTS = 3
BOOKING_WINDOW_DAYS = 14
MAX_NAME_LENGTH = 100
MAX_NOTES_LENGTH = 500

E164 = re.compile(r"^\+[1-9]\d{6,14}$")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

NO_CALLER_ID_MESSAGE = (
    "This call has no caller ID, so I can't book it: Nathan calls you back at "
    "the number you call from. The caller can book on the website at "
    f"{WEBSITE_FALLBACK}."
)

# Spoken names for common zones; anything else falls back to the IANA city.
ZONE_LABELS = {
    "America/Los_Angeles": "Pacific time",
    "America/Vancouver": "Pacific time",
    "America/Denver": "Mountain time",
    "America/Phoenix": "Arizona time",
    "America/Edmonton": "Mountain time",
    "America/Chicago": "Central time",
    "America/Winnipeg": "Central time",
    "America/New_York": "Eastern time",
    "America/Toronto": "Eastern time",
    "America/Anchorage": "Alaska time",
    "Pacific/Honolulu": "Hawaii time",
    "Europe/London": "UK time",
    "UTC": "UTC",
}


# --- formatting -------------------------------------------------------------


def zone_label(tz: ZoneInfo) -> str:
    if tz.key in ZONE_LABELS:
        return ZONE_LABELS[tz.key]
    return tz.key.rsplit("/", 1)[-1].replace("_", " ") + " time"


def speak_clock(value: dt.datetime) -> str:
    """``10 AM``, ``2:30 PM``: no leading zero, no ``:00``."""
    hour = value.hour % 12 or 12
    suffix = "AM" if value.hour < 12 else "PM"
    if value.minute:
        return f"{hour}:{value.minute:02d} {suffix}"
    return f"{hour} {suffix}"


def speak_day(value: dt.datetime) -> str:
    return f"{value:%A}, {value:%B} {value.day}"


def speak_when(value: dt.datetime, tz: ZoneInfo) -> str:
    local = value.astimezone(tz)
    return f"{speak_day(local)} at {speak_clock(local)} {zone_label(tz)}"


def last_four(phone: str) -> str:
    return phone[-4:]


def normalize_phone(raw: str | None) -> str | None:
    """Return an E.164 number, or None for withheld or unusable caller IDs."""
    if not raw:
        return None
    candidate = raw.strip()
    if candidate.lower().startswith("tel:"):
        candidate = candidate[4:]
    return candidate if E164.match(candidate) else None


def pick_spread(
    starts: list[dt.datetime], *, tz: ZoneInfo, one_day: bool, limit: int
) -> list[dt.datetime]:
    """Choose up to ``limit`` slots that are easy to choose between by ear.

    For one requested day, spread the picks across that day. Otherwise take
    the first open time on each of the next few days, then fill from the
    earliest remaining times.
    """
    starts = sorted(starts)
    if len(starts) <= limit:
        return starts
    if one_day:
        last = len(starts) - 1
        indices = sorted({round(i * last / (limit - 1)) for i in range(limit)})
        return [starts[i] for i in indices]

    picks: list[dt.datetime] = []
    seen_days: set[dt.date] = set()
    for start in starts:
        day = start.astimezone(tz).date()
        if day not in seen_days:
            seen_days.add(day)
            picks.append(start)
        if len(picks) == limit:
            return picks
    for start in starts:
        if start not in picks:
            picks.append(start)
        if len(picks) == limit:
            break
    return sorted(picks)


# --- state ------------------------------------------------------------------


@dataclass(frozen=True)
class OfferedSlot:
    ref: str
    start: dt.datetime
    duration_minutes: int


@dataclass(frozen=True)
class BookingDetails:
    slot: str
    duration_minutes: int
    name: str
    notes: str | None = None
    email: str | None = None

    def cleaned(self) -> BookingDetails:
        def clean(value: str | None) -> str | None:
            if value is None:
                return None
            value = " ".join(value.split())
            return value or None

        return replace(
            self,
            slot=self.slot.strip().lower(),
            name=clean(self.name) or "",
            notes=clean(self.notes),
            email=(clean(self.email) or "").lower() or None,
        )

    def key(self) -> tuple:
        c = self.cleaned()
        return (
            c.slot,
            c.duration_minutes,
            c.name.casefold(),
            (c.notes or "").casefold(),
            c.email,
        )


@dataclass(frozen=True)
class Review:
    details: BookingDetails
    # The function call id of the review tool call. Agreement only counts if
    # a caller message was committed to the conversation after it.
    call_id: str


def user_replied_after(items: Iterable[object], call_id: str) -> bool:
    """True if the caller answered a read-back they heard in full.

    ``items`` is the session's chat history, in order. After the review
    function call ``call_id``, it needs an assistant message whose speech
    finished without interruption (the read-back), followed by a user
    message (the answer). A caller turn that arrives before the read-back
    finished, or during one that was cut off, doesn't count: the caller
    hadn't heard the details yet. Whether the answer was a yes is the
    model's call, made when it decides to call ``book_call``.
    """
    seen_call = False
    heard_read_back = False
    for item in items:
        item_type = getattr(item, "type", None)
        if not seen_call:
            if (
                item_type == "function_call"
                and getattr(item, "call_id", None) == call_id
            ):
                seen_call = True
            continue
        if item_type != "message":
            continue
        role = getattr(item, "role", None)
        if role == "assistant":
            # A cut-off read-back means the caller didn't hear it all, so
            # it doesn't count, and any earlier complete one is superseded.
            heard_read_back = not getattr(item, "interrupted", False)
        elif role == "user" and heard_read_back:
            return True
    return False


class BookingDesk:
    """Everything one call knows about booking. One instance per session."""

    def __init__(
        self,
        *,
        calendar: Calendar,
        owner_tz: ZoneInfo,
        caller_phone: str | None,
        clock: Callable[[], dt.datetime] | None = None,
    ) -> None:
        self._calendar = calendar
        self.owner_tz = owner_tz
        self.caller_phone = normalize_phone(caller_phone)
        self._clock = clock or (lambda: dt.datetime.now(dt.UTC))
        self.caller_tz: ZoneInfo | None = None
        self.offered: dict[str, OfferedSlot] = {}
        # Labels come from a counter, never from len(offered): a slot removed
        # after it was taken must not free its label for a different time.
        self._slot_counter = 0
        self.review: Review | None = None
        self.booking: BookingResult | None = None
        self.booked_details: BookingDetails | None = None
        # A write Cal.com may have accepted without confirming. Once set, the
        # call books nothing else, so it can't double-book.
        self.unconfirmed: OfferedSlot | None = None
        # The invite address, set only by collect_email after GetEmailTask has
        # confirmed it with the caller. The model never types it.
        self.email: str | None = None
        self._lock = asyncio.Lock()

    # -- clock and zones --

    def now(self) -> dt.datetime:
        return self._clock().astimezone(self.owner_tz)

    def _display_zones(self) -> list[ZoneInfo]:
        zones = [self.owner_tz]
        if self.caller_tz is not None and self.caller_tz.key != self.owner_tz.key:
            zones.append(self.caller_tz)
        return zones

    def _speak_both(self, start: dt.datetime) -> str:
        zones = self._display_zones()
        text = speak_when(start, zones[0])
        if len(zones) > 1:
            text += f" ({speak_when(start, zones[1])} for the caller)"
        return text

    def set_caller_timezone(self, name: str | None) -> None:
        if not name or not name.strip():
            return
        try:
            self.caller_tz = ZoneInfo(name.strip())
        # OSError: with the tzdata package, a folder name such as "America"
        # raises IsADirectoryError rather than ZoneInfoNotFoundError.
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise ToolError(
                f"{name!r} is not a time zone name. Use an IANA name such as "
                "America/New_York, or leave it empty."
            ) from None

    # -- tools --

    async def list_slots(
        self,
        *,
        duration_minutes: int,
        day: str | None = None,
        caller_timezone: str | None = None,
    ) -> str:
        if duration_minutes not in ALLOWED_DURATIONS:
            raise ToolError("Calls are 15 or 30 minutes long.")
        self.set_caller_timezone(caller_timezone)

        now = self.now()
        window_end = now + dt.timedelta(days=BOOKING_WINDOW_DAYS)
        day_tz = self.caller_tz or self.owner_tz

        requested: dt.date | None = None
        if day and day.strip():
            try:
                requested = dt.date.fromisoformat(day.strip())
            except ValueError:
                raise ToolError(
                    "day must be a date in YYYY-MM-DD form; work it out from "
                    "today's date."
                ) from None
            start = max(now, dt.datetime.combine(requested, dt.time.min, day_tz))
            end = min(
                window_end,
                dt.datetime.combine(
                    requested + dt.timedelta(days=1), dt.time.min, day_tz
                ),
            )
            if start >= end:
                return (
                    f"{speak_day(dt.datetime.combine(requested, dt.time.min))} is "
                    f"outside the booking window. Calls can be booked from two "
                    f"hours from now through the next {BOOKING_WINDOW_DAYS} days."
                )
        else:
            start, end = now, window_end

        try:
            starts = await self._calendar.get_slots(
                start=start, end=end, duration_minutes=duration_minutes
            )
        except CalComError as exc:
            raise ToolError(exc.spoken) from exc

        starts = [s for s in starts if s > now]
        picks = pick_spread(
            starts,
            tz=day_tz,
            one_day=requested is not None,
            limit=MAX_OFFERED_SLOTS,
        )
        if not picks:
            where = (
                f"on {speak_day(dt.datetime.combine(requested, dt.time.min))}"
                if requested
                else f"in the next {BOOKING_WINDOW_DAYS} days"
            )
            return f"No open {duration_minutes}-minute times {where}."

        lines = [f"Open {duration_minutes}-minute times (offer these, nothing else):"]
        for start_at in picks:
            slot = self._offer(start_at, duration_minutes)
            lines.append(f"{slot.ref}: {self._speak_both(slot.start)}")
        if self.caller_phone is None:
            lines.append(NO_CALLER_ID_MESSAGE)
        return "\n".join(lines)

    def _offer(self, start: dt.datetime, duration_minutes: int) -> OfferedSlot:
        for slot in self.offered.values():
            if slot.start == start and slot.duration_minutes == duration_minutes:
                return slot
        self._slot_counter += 1
        slot = OfferedSlot(
            ref=f"slot-{self._slot_counter}",
            start=start,
            duration_minutes=duration_minutes,
        )
        self.offered[slot.ref] = slot
        return slot

    def _validate(self, details: BookingDetails) -> tuple[BookingDetails, OfferedSlot]:
        if self.unconfirmed is not None:
            raise ToolError(
                "A booking for "
                f"{self._speak_both(self.unconfirmed.start)} may already have gone "
                "through but wasn't confirmed. To avoid a double booking, nothing "
                "else can be booked on this call; the caller can check or book on "
                f"the website at {WEBSITE_FALLBACK}."
            )
        if self.booking is not None:
            raise ToolError(
                "This call already booked a phone call with Nathan "
                f"({self._speak_both(self.booking.start)}). Only one booking "
                "per call."
            )
        if self.caller_phone is None:
            raise ToolError(NO_CALLER_ID_MESSAGE)

        details = details.cleaned()
        slot = self.offered.get(details.slot)
        if slot is None:
            raise ToolError(
                f"{details.slot!r} isn't a time offered on this call. Only book a "
                "slot that list_available_slots returned."
            )
        if details.duration_minutes != slot.duration_minutes:
            raise ToolError(
                f"{slot.ref} was offered as a {slot.duration_minutes}-minute call. "
                "List times again for a different length."
            )
        if not details.name:
            raise ToolError("Ask for the caller's name first.")
        if len(details.name) > MAX_NAME_LENGTH:
            raise ToolError("That name is too long; ask for a shorter form.")
        if details.notes and len(details.notes) > MAX_NOTES_LENGTH:
            raise ToolError("Shorten the notes to a sentence or two.")
        if details.email and not EMAIL.match(details.email):
            raise ToolError(
                "That email address doesn't look complete. Ask the caller to "
                "spell it again."
            )
        return details, slot

    def review_booking(self, details: BookingDetails, *, call_id: str) -> str:
        details, slot = self._validate(details)
        self.review = Review(details=details, call_id=call_id)
        assert self.caller_phone is not None  # checked by _validate
        parts = [
            "Read this back to the caller and ask whether to book it:",
            f"when: {self._speak_both(slot.start)}",
            f"length: {slot.duration_minutes} minutes",
            f"name: {details.name}",
            "Nathan calls the number this call is coming from, ending in "
            f"{' '.join(last_four(self.caller_phone))}",
        ]
        if details.notes:
            parts.append(f"topic: {details.notes}")
        if details.email:
            parts.append(f"calendar invite to: {details.email} (spell it out)")
        else:
            parts.append("no calendar invite (no email)")
        return "\n".join(parts)

    def check_approval(
        self, details: BookingDetails, *, history: Iterable[object]
    ) -> None:
        """Raise ToolError unless ``details`` were reviewed and then answered."""
        details, _ = self._validate(details)
        if self.review is None:
            raise ToolError(
                "Call review_booking first, read the details back, and wait for "
                "the caller to agree."
            )
        if self.review.details.key() != details.key():
            raise ToolError(
                "These details differ from the ones read back. Call "
                "review_booking with the new details and read them back again."
            )
        if not user_replied_after(history, self.review.call_id):
            raise ToolError(
                "The caller hasn't answered a complete read-back yet. Read the "
                "details back in full and wait for a yes."
            )

    async def commit(self, details: BookingDetails) -> str:
        """Create the booking. Call only after ``check_approval`` passed."""
        async with self._lock:
            details, slot = self._validate(details)
            assert self.caller_phone is not None
            tz = self.caller_tz or self.owner_tz
            request = BookingRequest(
                start=slot.start,
                duration_minutes=slot.duration_minutes,
                name=details.name,
                phone_number=self.caller_phone,
                time_zone=tz.key,
                email=details.email,
                notes=details.notes,
            )
            try:
                result = await self._calendar.create_booking(request)
            except EmailRejectedError as exc:
                # Nothing was booked and the slot is still offered; only the
                # address has to change, so the caller must hear a new review.
                domain = (request.email or "").rpartition("@")[2] or "?"
                logger.warning("cal.com rejected the invite email (domain %s)", domain)
                self.email = None
                self.review = None
                raise ToolError(
                    f"{exc.spoken} Ask the caller which they prefer. To retry, call "
                    "collect_email. To skip the invite, go ahead without it. Either "
                    "way, call review_booking again and get a yes before book_call."
                ) from exc
            except BookingOutcomeUnknownError as exc:
                self.unconfirmed = slot
                self.review = None
                raise ToolError(exc.spoken) from exc
            except CalComError as exc:
                if isinstance(exc, SlotUnavailableError):
                    self.offered.pop(slot.ref, None)
                raise ToolError(exc.spoken) from exc

            self.booking = result
            self.booked_details = details
            self.review = None

        if not details.email:
            invite = "No calendar invite will be sent."
        elif result.email_kept is False:
            # Cal.com booked the call but didn't keep the address, so don't
            # promise an invite that won't arrive (#1572).
            invite = (
                "The call is booked, but Nathan's calendar didn't confirm the "
                f"invite address, so an invite to {details.email} may not arrive."
            )
        else:
            invite = f"A calendar invite goes to {details.email}."
        return (
            f"Booked. Nathan will call {details.name} on "
            f"{self._speak_both(result.start)} for {slot.duration_minutes} "
            f"minutes, at the number this call came from. {invite}"
        )

    def set_email(self, email: str) -> str:
        """Record the confirmed invite address and say what to do next."""
        cleaned = (email or "").strip().lower()
        if not EMAIL.match(cleaned):
            raise ToolError(
                "That email address doesn't look complete. Collect it again, or "
                "book without a calendar invite."
            )
        self.email = cleaned
        self.review = None
        return (
            f"Recorded {cleaned} for the calendar invite. Call review_booking "
            "next; it includes this address."
        )

    async def capture_email(self, capture: Callable[[], Awaitable[str]]) -> str:
        """Run an email capture and record its result.

        If the capture fails (the caller declines, or the address can't be
        confirmed), any earlier address is cleared too, so a booking made
        "without an invite" can't still carry an old one (#1572).
        """
        try:
            email = await capture()
        except ToolError as exc:
            self.email = None
            self.review = None
            raise ToolError(
                f"{exc.message} No invite address is stored now. Ask whether to "
                "try again or book without an invite, and review the booking "
                "again before book_call."
            ) from exc
        return self.set_email(email)

    def clear_email(self) -> str:
        """Drop the invite address when the caller no longer wants an invite."""
        if self.booking is not None:
            # The booking already went to Cal.com with this address; clearing
            # local state can't recall the invite (#1572).
            return (
                "The call is already booked, and Nathan's calendar already has "
                "that address, so I can't withdraw the invite from here. Tell the "
                "caller they can ignore or decline it, and that Nathan will still "
                "call at the booked time."
            )
        had_email = self.email is not None
        self.email = None
        self.review = None
        if not had_email:
            return "There was no invite address to remove. Carry on without one."
        return (
            "Removed the invite address; no calendar invite will be sent. Call "
            "review_booking again and read it back before booking."
        )

    def status_for_goodbye(self) -> str:
        if self.unconfirmed is not None:
            return (
                "A booking for "
                f"{self._speak_both(self.unconfirmed.start)} was sent but not "
                "confirmed, so it may or may not have gone through. If it didn't, "
                f"the caller can book on the website at {WEBSITE_FALLBACK}."
            )
        if self.booking is not None and self.booked_details is not None:
            return (
                "A call is booked: Nathan will call on "
                f"{self._speak_both(self.booking.start)}."
            )
        return (
            "Nothing was booked on this call. The caller can book on the "
            f"website at {WEBSITE_FALLBACK}."
        )
