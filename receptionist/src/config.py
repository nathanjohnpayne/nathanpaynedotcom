"""Runtime configuration, read from the environment.

The agent refuses to start without its Cal.com settings: a receptionist that
can't reach the calendar would greet callers and then fail every booking.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_OWNER_TIMEZONE = "America/Los_Angeles"


class ConfigError(RuntimeError):
    """Raised when a required setting is missing or malformed."""


@dataclass(frozen=True)
class Settings:
    cal_api_key: str
    cal_event_type_id: int
    owner_timezone: ZoneInfo
    # Development only: a caller number used when the session has no SIP
    # caller (console mode or the browser Agent Console). Never set it in a
    # deployed environment. See README.md, "Local development".
    dev_caller_phone: str | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env

        missing = [
            name
            for name in ("CAL_API_KEY", "CAL_EVENT_TYPE_ID")
            if not env.get(name, "").strip()
        ]
        if missing:
            raise ConfigError(
                "Missing required environment variable(s): "
                + ", ".join(missing)
                + ". Copy .env.example to .env.local and fill them in."
            )

        raw_id = env["CAL_EVENT_TYPE_ID"].strip()
        try:
            event_type_id = int(raw_id)
        except ValueError:
            raise ConfigError(
                "CAL_EVENT_TYPE_ID must be the numeric Cal.com event type ID."
            ) from None
        if event_type_id <= 0:
            raise ConfigError("CAL_EVENT_TYPE_ID must be a positive integer.")

        tz_name = env.get("OWNER_TIMEZONE", "").strip() or DEFAULT_OWNER_TIMEZONE
        try:
            owner_tz = ZoneInfo(tz_name)
        # OSError: with the tzdata package, a folder name such as "Pacific"
        # raises IsADirectoryError rather than ZoneInfoNotFoundError.
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise ConfigError(
                f"OWNER_TIMEZONE {tz_name!r} is not an IANA time zone name."
            ) from None

        dev_phone = env.get("DEV_CALLER_PHONE", "").strip() or None

        return cls(
            cal_api_key=env["CAL_API_KEY"].strip(),
            cal_event_type_id=event_type_id,
            owner_timezone=owner_tz,
            dev_caller_phone=dev_phone,
        )
