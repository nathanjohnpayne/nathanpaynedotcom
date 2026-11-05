"""Agent wiring that needs no model: caller ID source, tool surface, greeting."""

from __future__ import annotations

import inspect

import pytest
from fakes import CALLER_PHONE, OTHER_PHONE

from agent import (
    AGENT_NAME,
    SIP_PHONE_ATTRIBUTE,
    Receptionist,
    caller_phone_for,
    check_startup,
)
from config import ConfigError, Settings
from prompts import GREETING


def test_agent_registers_an_explicit_dispatch_name():
    assert AGENT_NAME == "receptionist"


def test_sip_caller_id_is_the_phone_number():
    assert (
        caller_phone_for(
            is_sip=True,
            attributes={SIP_PHONE_ATTRIBUTE: CALLER_PHONE},
            dev_caller_phone=OTHER_PHONE,
        )
        == CALLER_PHONE
    )


@pytest.mark.parametrize(
    "attributes", [{}, {SIP_PHONE_ATTRIBUTE: ""}, {SIP_PHONE_ATTRIBUTE: "anonymous"}]
)
def test_withheld_sip_caller_id_never_falls_back(attributes):
    # The development number must not stand in for a real caller.
    assert (
        caller_phone_for(
            is_sip=True, attributes=attributes, dev_caller_phone=OTHER_PHONE
        )
        is None
    )


def test_dev_number_only_for_non_sip_sessions():
    assert (
        caller_phone_for(is_sip=False, attributes={}, dev_caller_phone=OTHER_PHONE)
        == OTHER_PHONE
    )
    assert caller_phone_for(is_sip=False, attributes={}, dev_caller_phone=None) is None


def _tool_params(tool) -> list[str]:
    params = inspect.signature(tool._func).parameters
    return [name for name in params if name not in ("self", "context")]


def test_booking_tools_take_no_phone_number():
    for tool in (Receptionist.book_call, Receptionist.review_booking):
        params = _tool_params(tool)
        assert params == ["slot", "duration_minutes", "name", "notes", "email"]
        assert not any("phone" in p for p in params)


def test_list_tool_arguments():
    assert _tool_params(Receptionist.list_available_slots) == [
        "duration_minutes",
        "day",
        "caller_timezone",
    ]


def test_greeting_discloses_ai_transcription_and_offer():
    text = GREETING.lower()
    assert "nathan payne's ai receptionist" in text
    assert "transcribed by ai" in text
    assert "not recorded" in text
    assert "15 or 30 minute" in text


def _settings(dev_caller_phone):
    return Settings.from_env(
        {
            "CAL_API_KEY": "test-key",
            "CAL_EVENT_TYPE_ID": "1",
            **({"DEV_CALLER_PHONE": dev_caller_phone} if dev_caller_phone else {}),
        }
    )


def test_production_start_refuses_the_dev_caller_number():
    with pytest.raises(ConfigError, match="DEV_CALLER_PHONE"):
        check_startup("start", _settings(OTHER_PHONE))


@pytest.mark.parametrize("mode", ["dev", "console", "connect"])
def test_local_modes_allow_the_dev_caller_number(mode):
    check_startup(mode, _settings(OTHER_PHONE))


def test_production_start_without_the_dev_number_is_fine():
    check_startup("start", _settings(None))
