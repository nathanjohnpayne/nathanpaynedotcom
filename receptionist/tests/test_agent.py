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


def test_booking_tools_take_no_phone_number_or_email():
    # Caller ID supplies the number, and collect_email supplies the invite
    # address after GetEmailTask confirms it: the model types neither (#1565).
    for tool in (Receptionist.book_call, Receptionist.review_booking):
        params = _tool_params(tool)
        assert params == ["slot", "duration_minutes", "name", "notes"]
        assert not any("phone" in p or "email" in p for p in params)


def test_email_tools_take_no_arguments():
    assert _tool_params(Receptionist.collect_email) == []
    assert _tool_params(Receptionist.remove_email) == []


def test_list_tool_arguments():
    assert _tool_params(Receptionist.list_available_slots) == [
        "duration_minutes",
        "day",
        "caller_timezone",
    ]


def test_greeting_discloses_ai_transcription_retention_and_offer():
    text = GREETING.lower()
    assert "nathan payne's ai receptionist" in text
    assert "transcribed by ai" in text
    # Agent observability keeps the transcript for LiveKit's 30 days; audio
    # recording is off in code (record={"audio": False}). The greeting must
    # not say the call is "not recorded" without qualification (#1566).
    assert "the transcript is kept for 30 days" in text
    assert "the audio isn't recorded" in text
    assert "is not recorded" not in text
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


# --- how the receptionist was built ---------------------------------------------


def test_the_build_answers_are_in_the_instructions():
    import datetime as dt

    from prompts import BUILD_ANSWER, MODELS_ANSWER, build_instructions

    instructions = build_instructions(
        today=dt.date(2026, 11, 6), owner_zone_label="Pacific time"
    )
    assert BUILD_ANSWER in instructions
    assert MODELS_ANSWER in instructions


def test_the_models_answer_names_the_models_the_agent_runs():
    from agent import LLM_MODEL, STT_MODEL, TTS_MODEL
    from prompts import MODELS_ANSWER

    # If a model constant changes, the spoken answer must change with it.
    assert STT_MODEL.startswith("assemblyai/universal")
    assert "AssemblyAI Universal" in MODELS_ANSWER
    assert LLM_MODEL.startswith("google/gemma-4")
    assert "Google's Gemma 4" in MODELS_ANSWER
    assert TTS_MODEL.startswith("fishaudio/")
    assert "Fish Audio" in MODELS_ANSWER


# --- analytics wiring (#1573) -------------------------------------------------


def test_a_console_session_is_always_an_internal_test():
    from agent import is_internal_call

    assert is_internal_call(is_sip=False, caller_phone=None, owner_phone=None)


def test_only_the_owners_number_marks_a_phone_call_internal():
    from agent import is_internal_call

    assert is_internal_call(
        is_sip=True, caller_phone=CALLER_PHONE, owner_phone=CALLER_PHONE
    )
    assert not is_internal_call(
        is_sip=True, caller_phone=OTHER_PHONE, owner_phone=CALLER_PHONE
    )
    assert not is_internal_call(
        is_sip=True, caller_phone=CALLER_PHONE, owner_phone=None
    )
    # A withheld caller ID never matches, even with no owner number set.
    assert not is_internal_call(is_sip=True, caller_phone=None, owner_phone=None)


@pytest.mark.parametrize(
    ("reason", "cap_hung_up", "expected"),
    [
        ("participant_disconnected", False, "caller"),
        ("user_initiated", False, "agent"),
        ("user_initiated", True, "cap"),
        ("participant_disconnected", True, "cap"),
        ("error", False, "error"),
        ("job_shutdown", False, "other"),
        ("task_completed", False, "other"),
    ],
)
def test_who_ended_the_call(reason, cap_hung_up, expected):
    from livekit.agents import CloseReason

    from agent import ended_by_for

    assert ended_by_for(CloseReason(reason), cap_hung_up=cap_hung_up) == expected


BASE_ENV = {"CAL_API_KEY": "cal_test_not_a_real_key", "CAL_EVENT_TYPE_ID": "1000001"}


def test_analytics_is_off_without_a_token():
    from agent import build_analytics

    analytics = build_analytics(Settings.from_env(BASE_ENV), internal=False)
    assert analytics.enabled is False


def test_analytics_is_on_with_a_token(monkeypatch):
    import agent

    made = []
    monkeypatch.setattr(
        agent, "PostHogSink", lambda token, host: made.append((token, host)) or object()
    )
    settings = Settings.from_env({**BASE_ENV, "POSTHOG_PROJECT_TOKEN": "phc_test"})
    analytics = agent.build_analytics(settings, internal=False)
    assert analytics.enabled is True
    assert made == [("phc_test", "https://us.i.posthog.com")]


def test_a_client_that_fails_to_start_turns_analytics_off(monkeypatch):
    import agent

    def broken(token, host):
        raise RuntimeError("no network")

    monkeypatch.setattr(agent, "PostHogSink", broken)
    settings = Settings.from_env({**BASE_ENV, "POSTHOG_PROJECT_TOKEN": "phc_test"})
    assert agent.build_analytics(settings, internal=True).enabled is False
