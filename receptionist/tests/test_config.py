"""Configuration fails fast and never needs a real key to test."""

from __future__ import annotations

import pytest

from config import DEFAULT_OWNER_TIMEZONE, ConfigError, Settings

BASE = {"CAL_API_KEY": "cal_test_not_a_real_key", "CAL_EVENT_TYPE_ID": "1000001"}


def test_reads_settings_with_defaults():
    settings = Settings.from_env(BASE)
    assert settings.cal_api_key == "cal_test_not_a_real_key"
    assert settings.cal_event_type_id == 1000001
    assert (
        settings.owner_timezone.key == DEFAULT_OWNER_TIMEZONE == "America/Los_Angeles"
    )
    assert settings.dev_caller_phone is None


@pytest.mark.parametrize("missing", ["CAL_API_KEY", "CAL_EVENT_TYPE_ID"])
def test_missing_cal_settings_fail_fast(missing):
    env = {k: v for k, v in BASE.items() if k != missing}
    with pytest.raises(ConfigError, match=missing):
        Settings.from_env(env)


def test_blank_values_count_as_missing():
    with pytest.raises(ConfigError, match="CAL_API_KEY"):
        Settings.from_env({**BASE, "CAL_API_KEY": "  "})


@pytest.mark.parametrize("value", ["abc", "0", "-4"])
def test_event_type_id_must_be_a_positive_integer(value):
    with pytest.raises(ConfigError, match="CAL_EVENT_TYPE_ID"):
        Settings.from_env({**BASE, "CAL_EVENT_TYPE_ID": value})


def test_owner_timezone_is_validated():
    assert (
        Settings.from_env(
            {**BASE, "OWNER_TIMEZONE": "America/New_York"}
        ).owner_timezone.key
        == "America/New_York"
    )
    with pytest.raises(ConfigError, match="OWNER_TIMEZONE"):
        Settings.from_env({**BASE, "OWNER_TIMEZONE": "Pacific"})
