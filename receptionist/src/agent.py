"""Nathan Payne's AI receptionist: answers a phone call and books a call-back.

Run locally with ``lk agent console`` or ``lk agent dev``; in production,
``uv run src/agent.py start``. See README.md.
"""

from __future__ import annotations

import logging
import sys
from collections.abc import Mapping
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    NOT_GIVEN,
    Agent,
    AgentServer,
    AgentSession,
    CloseEvent,
    CloseReason,
    JobContext,
    RunContext,
    STTContextOptions,
    TurnHandlingOptions,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.agents.beta.tools import EndCallTool
from livekit.agents.beta.workflows import GetEmailTask
from livekit.plugins import ai_coustics

from analytics import CallAnalytics, PostHogSink
from booking import BookingDesk, BookingDetails, normalize_phone, zone_label
from calcom import CalComClient
from config import ConfigError, Settings
from prompts import GREETING, build_instructions
from session_cap import SessionCap

logger = logging.getLogger("receptionist")

load_dotenv(".env.local")

# The dispatch name. A SIP dispatch rule targets the agent by this name.
AGENT_NAME = "receptionist"

# LiveKit Inference models, as in agent-starter-python.
LLM_MODEL = "google/gemma-4-31b-it"
STT_MODEL = "assemblyai/universal-3-6-pro"
TTS_MODEL = "fishaudio/s2.1-pro"
TTS_VOICE = "fa4c9eb3dccc4806b382b40d61c6b10a"

SIP_PHONE_ATTRIBUTE = "sip.phoneNumber"


class Receptionist(Agent):
    def __init__(self, *, owner_tz: ZoneInfo, today, llm=None) -> None:
        end_call = EndCallTool(
            extra_description=(
                "Only end the call after the caller says goodbye or says they "
                "need nothing else."
            ),
            delete_room=True,
            end_instructions="Say a short, friendly goodbye.",
        )
        super().__init__(
            instructions=build_instructions(
                today=today, owner_zone_label=zone_label(owner_tz)
            ),
            llm=llm or inference.LLM(model=LLM_MODEL),
            tools=end_call.tools,
        )

    async def on_enter(self) -> None:
        # The disclosure is spoken verbatim, can't be talked over, and is
        # finished before the caller's first turn is answered.
        await self.session.say(GREETING, allow_interruptions=False)

    @function_tool
    async def list_available_slots(
        self,
        context: RunContext[BookingDesk],
        duration_minutes: int,
        day: str | None = None,
        caller_timezone: str | None = None,
    ) -> str:
        """Look up open times for a phone call with Nathan. Returns up to three
        times, each with a slot label to use with review_booking and book_call.

        Args:
            duration_minutes: Call length, 15 or 30. Use 30 unless the caller asked for 15.
            day: Optional. A specific day the caller asked for, as YYYY-MM-DD. Leave empty for the soonest times.
            caller_timezone: Optional. The caller's time zone as an IANA name, such as America/New_York, if they mentioned it.
        """
        return await context.userdata.list_slots(
            duration_minutes=duration_minutes,
            day=day,
            caller_timezone=caller_timezone,
        )

    @function_tool
    async def collect_email(self, context: RunContext[BookingDesk]) -> str:
        """Collect the caller's email address for a calendar invite. Call this
        only if the caller wants an invite. It asks for the address, handles
        spoken spelling, and confirms it with the caller. Never write an email
        address into any other tool yourself.
        """

        # GetEmailTask normalizes spoken addresses ("dot", "underscore",
        # letter-by-letter spelling) and confirms with the caller, which a
        # free-text tool argument transcribed from speech did not (#1565).
        # The LLM lives on this agent, not the session, so the task needs it
        # passed in or it has no model to reply with.
        async def capture() -> str:
            result = await GetEmailTask(
                llm=self.llm,
                chat_ctx=self.chat_ctx,
                require_explicit_ask=True,
                verify_spelling=True,
            )
            return result.email_address

        return await context.userdata.capture_email(capture)

    @function_tool
    async def remove_email(self, context: RunContext[BookingDesk]) -> str:
        """Remove the stored invite address. Call this if the caller no longer
        wants a calendar invite after collect_email recorded one.
        """
        return context.userdata.clear_email()

    @function_tool
    async def review_booking(
        self,
        context: RunContext[BookingDesk],
        slot: str,
        duration_minutes: int,
        name: str,
        notes: str | None = None,
    ) -> str:
        """Check a booking before reading it back. Call this once the caller has
        picked a time and given their name, then read the result back to the
        caller and ask whether to book it. This does not book anything. It
        includes the invite address collect_email recorded, if any.

        Args:
            slot: The slot label from list_available_slots, such as slot-2.
            duration_minutes: 15 or 30, the length the slot was offered for.
            name: The caller's name.
            notes: Optional. What the caller wants to discuss.
        """
        desk = context.userdata
        return desk.review_booking(
            BookingDetails(slot, duration_minutes, name, notes, desk.email),
            call_id=context.function_call.call_id,
        )

    @function_tool
    async def book_call(
        self,
        context: RunContext[BookingDesk],
        slot: str,
        duration_minutes: int,
        name: str,
        notes: str | None = None,
    ) -> str:
        """Book the phone call on Nathan's calendar. Only call this after
        review_booking, after reading the details back, and after the caller
        said yes to them. Pass exactly the details that were reviewed.

        Args:
            slot: The reviewed slot label, such as slot-2.
            duration_minutes: The reviewed length, 15 or 30.
            name: The reviewed name.
            notes: The reviewed topic, if any.
        """
        desk = context.userdata
        details = BookingDetails(slot, duration_minutes, name, notes, desk.email)
        desk.check_approval(details, history=context.session.history.items)
        # Writing to the calendar can't be rolled back, so the caller can't
        # interrupt it halfway.
        context.disallow_interruptions()
        return await desk.commit(details)


def caller_phone_for(
    *,
    is_sip: bool,
    attributes: Mapping[str, str],
    dev_caller_phone: str | None,
) -> str | None:
    """The number Nathan will call back: the SIP caller ID and nothing else.

    A SIP call with a withheld or malformed caller ID gets None, so it can't
    book. ``dev_caller_phone`` only applies to sessions with no SIP caller
    at all (console mode, the browser Agent Console) so the booking flow can
    be tried locally.
    """
    if is_sip:
        return normalize_phone(attributes.get(SIP_PHONE_ATTRIBUTE))
    if dev_caller_phone:
        logger.warning("no SIP caller; using DEV_CALLER_PHONE for this session")
    return normalize_phone(dev_caller_phone)


def is_internal_call(
    *, is_sip: bool, caller_phone: str | None, owner_phone: str | None
) -> bool:
    """Whether analytics should mark this call as the owner's own test.

    A session with no SIP caller (console mode, the browser Agent Console) is
    always the owner testing. A phone call counts only when caller ID matches
    OWNER_PHONE; the comparison happens here and only the answer is sent.
    """
    if not is_sip:
        return True
    return owner_phone is not None and caller_phone == owner_phone


def ended_by_for(reason: CloseReason, *, cap_hung_up: bool) -> str:
    """Who ended the call, for the call_ended event."""
    if cap_hung_up:
        return "cap"
    if reason == CloseReason.PARTICIPANT_DISCONNECTED:
        return "caller"
    # EndCallTool and the session cap both end the session with
    # session.shutdown(), which closes as USER_INITIATED; the cap is caught
    # above by its own flag, so this is the agent's goodbye.
    if reason == CloseReason.USER_INITIATED:
        return "agent"
    if reason == CloseReason.ERROR:
        return "error"
    return "other"


def build_analytics(settings: Settings, *, internal: bool) -> CallAnalytics:
    """A call's analytics: off without a token, and never fatal to the call."""
    if not settings.posthog_project_token:
        return CallAnalytics(internal=internal)
    try:
        sink = PostHogSink(settings.posthog_project_token, host=settings.posthog_host)
    except Exception:
        logger.exception("analytics: PostHog client failed to start; analytics off")
        return CallAnalytics(internal=internal)
    return CallAnalytics(sink, internal=internal)


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def receptionist(ctx: JobContext) -> None:
    settings = Settings.from_env()
    ctx.log_context_fields = {"room": ctx.room.name}

    participant_identity: str | None = None
    is_sip = False
    if ctx.is_fake_job():
        # Console mode has no room participants to wait for.
        caller_phone = caller_phone_for(
            is_sip=False, attributes={}, dev_caller_phone=settings.dev_caller_phone
        )
    else:
        participant = await ctx.wait_for_participant()
        participant_identity = participant.identity
        is_sip = participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
        caller_phone = caller_phone_for(
            is_sip=is_sip,
            attributes=participant.attributes,
            dev_caller_phone=settings.dev_caller_phone,
        )
    logger.info("caller id %s", "present" if caller_phone else "absent")

    analytics = build_analytics(
        settings,
        internal=is_internal_call(
            is_sip=is_sip, caller_phone=caller_phone, owner_phone=settings.owner_phone
        ),
    )
    analytics.call_started(caller_id_present=caller_phone is not None)

    calendar = CalComClient(
        api_key=settings.cal_api_key, event_type_id=settings.cal_event_type_id
    )
    desk = BookingDesk(
        calendar=calendar,
        owner_tz=settings.owner_timezone,
        caller_phone=caller_phone,
        analytics=analytics,
    )

    session = AgentSession[BookingDesk](
        userdata=desk,
        stt=inference.STT(model=STT_MODEL, language="en"),
        stt_context_options=STTContextOptions(
            keyterms=["Nathan Payne"],
            keyterm_detection={"enabled": True},
        ),
        tts=inference.TTS(model=TTS_MODEL, voice=TTS_VOICE),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
            preemptive_generation={"enabled": True},
        ),
        expressive=True,
    )

    def goodbye() -> None:
        session.generate_reply(
            instructions=(
                "The call is about to end because of the five-minute limit. "
                f"{desk.status_for_goodbye()} Say that in one or two short "
                "sentences and say goodbye. Don't ask any questions."
            ),
            allow_interruptions=False,
            tool_choice="none",
        )

    cap_hung_up = False

    async def hang_up() -> None:
        nonlocal cap_hung_up
        cap_hung_up = True
        session.shutdown(drain=False)
        await ctx.delete_room()

    cap = SessionCap(on_goodbye=goodbye, on_hang_up=hang_up)

    def on_close(ev: CloseEvent) -> None:
        cap.cancel()
        analytics.call_ended(
            booked=desk.booking is not None,
            ended_by=ended_by_for(ev.reason, cap_hung_up=cap_hung_up),
        )

    session.on("close", on_close)

    async def send_analytics() -> None:
        # If the job ends without a session close event, the call still gets
        # its last event; call_ended ignores a second call.
        analytics.call_ended(
            booked=desk.booking is not None,
            ended_by="cap" if cap_hung_up else "other",
        )
        await analytics.aclose()

    ctx.add_shutdown_callback(send_analytics)
    # The clock starts when the agent picks up, before the greeting.
    cap.start()

    await session.start(
        agent=Receptionist(owner_tz=settings.owner_timezone, today=desk.now().date()),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            participant_identity=participant_identity or NOT_GIVEN,
            audio_input=room_io.AudioInputOptions(
                # Background noise suppression, included with LiveKit Cloud at
                # no extra cost (voice isolation models are billed separately).
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_L
                ),
            ),
        ),
        # Transcripts follow the project's observability setting; audio is
        # never recorded, as the greeting promises.
        record={"audio": False},
    )


def check_startup(mode: str, settings: Settings) -> None:
    """Refuse a production start that carries the development caller number.

    ``start`` is the production mode LiveKit Cloud runs. With
    DEV_CALLER_PHONE set there, any non-SIP session could book a call to that
    number, so it's a configuration error rather than a warning.
    """
    if mode == "start" and settings.dev_caller_phone:
        raise ConfigError(
            "DEV_CALLER_PHONE is for local development only; unset it before "
            "running in production."
        )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("dev", "start", "console", "connect"):
        try:
            check_startup(sys.argv[1], Settings.from_env())
        except ConfigError as exc:
            sys.exit(f"Configuration error: {exc}")
    cli.run_app(server)
