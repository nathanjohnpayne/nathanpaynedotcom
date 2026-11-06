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


def test_analytics_settings_default_to_off():
    settings = Settings.from_env(BASE)
    assert settings.posthog_project_token is None
    assert settings.posthog_host == "https://us.i.posthog.com"
    assert settings.owner_phone is None


def test_analytics_settings_are_read():
    settings = Settings.from_env(
        {
            **BASE,
            "POSTHOG_PROJECT_TOKEN": " phc_test ",
            "POSTHOG_HOST": "https://eu.i.posthog.com",
            "OWNER_PHONE": "+15555550100",
        }
    )
    assert settings.posthog_project_token == "phc_test"
    assert settings.posthog_host == "https://eu.i.posthog.com"
    assert settings.owner_phone == "+15555550100"


def test_a_malformed_owner_phone_turns_analytics_off_without_echoing_it(caplog):
    # Analytics must never stop the receptionist from starting. A bad owner
    # number would let the owner's test calls count as real callers, so
    # analytics go off instead, and the warning names only the setting.
    settings = Settings.from_env(
        {**BASE, "POSTHOG_PROJECT_TOKEN": "phc_test", "OWNER_PHONE": "555-0100"}
    )
    assert settings.posthog_project_token is None
    assert settings.owner_phone is None
    assert "OWNER_PHONE" in caplog.text
    assert "555-0100" not in caplog.text


def test_a_non_https_posthog_host_turns_analytics_off(caplog):
    settings = Settings.from_env(
        {
            **BASE,
            "POSTHOG_PROJECT_TOKEN": "phc_test",
            "POSTHOG_HOST": "http://us.i.posthog.com",
        }
    )
    assert settings.posthog_project_token is None
    assert "POSTHOG_HOST" in caplog.text
    assert "http://us.i.posthog.com" not in caplog.text


def test_valid_analytics_settings_survive_alongside_each_other():
    settings = Settings.from_env(
        {
            **BASE,
            "POSTHOG_PROJECT_TOKEN": "phc_test",
            "POSTHOG_HOST": "https://eu.i.posthog.com",
            "OWNER_PHONE": "+15555550100",
        }
    )
    assert settings.posthog_project_token == "phc_test"
    assert settings.posthog_host == "https://eu.i.posthog.com"
    assert settings.owner_phone == "+15555550100"
