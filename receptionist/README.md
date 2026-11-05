# Receptionist

A voice agent that answers a phone number and books a 15- or 30-minute phone call with Nathan Payne. You call the number, the agent offers open times from Nathan's calendar, reads the booking back, and books it once you say yes. Nathan then calls you back at the number you called from. It's a working demo built for a LiveKit role application, on LiveKit Cloud's free Build plan.

The agent was built from LiveKit's [`agent-starter-python`](https://github.com/livekit-examples/agent-starter-python) template, with a Cal.com client adapted from the [front-desk example](https://github.com/livekit/agents/tree/main/examples/frontdesk) in `livekit/agents`. See [`NOTICE`](NOTICE) for both.

## How It Works

```text
caller ──▶ LiveKit phone number ──▶ SIP dispatch rule ──▶ agent "receptionist" on LiveKit Cloud
                                                              │
                                    LiveKit Inference ◀───────┤  speech-to-text, LLM, text-to-speech
                                    Cal.com API v2    ◀───────┘  open slots, create booking
```

1. A call to the LiveKit phone number matches a SIP dispatch rule, which puts the caller in a new room and dispatches the agent by its registered name, `receptionist` (`AGENT_NAME` in `src/agent.py`).
2. The agent reads the caller's number from the SIP participant's `sip.phoneNumber` attribute. That caller ID is the only number it ever books; it never takes a number from speech or from the model.
3. It speaks a fixed greeting (`GREETING` in `src/prompts.py`): it is Nathan Payne's AI receptionist, the call is transcribed by AI and not recorded, and it can book a 15- or 30-minute call.
4. The voice pipeline runs on [LiveKit Inference](https://docs.livekit.io/agents/models/inference/), using the starter's models: AssemblyAI Universal 3.6 Pro for speech-to-text, Gemma 4 31B for the LLM, and Fish Audio S2.1 Pro for text-to-speech, with the LiveKit turn detector and ai-coustics background noise suppression.
5. The agent has three booking tools, backed by the Cal.com API v2:
   - `list_available_slots(duration_minutes, day?, caller_timezone?)` returns at most three upcoming open times, in Pacific time and in the caller's time zone if they gave one. Each time gets a label like `slot-2`; the exact start time stays on the server.
   - `review_booking(slot, duration_minutes, name, notes?, email?)` checks the details and hands them back for the agent to read out. It books nothing.
   - `book_call(slot, duration_minutes, name, notes?, email?)` books the reviewed slot on the Cal.com event type for phone calls.
6. Every call ends by the five-minute mark. At 4:30 the agent says a short goodbye with the booking status, and at 5:00 it hangs up by closing the session and deleting the room. The agent can also end the call earlier when the caller says goodbye.

### Booking Rules

The model interprets the conversation; code in `src/booking.py` enforces the rules:

- A booking can only use a slot offered earlier in the same call, for the length it was offered at.
- `book_call` refuses unless `review_booking` ran with the same details and the caller spoke after that review. Whether the caller said yes is the model's judgment; the instructions tell it to read back the day, time with time zone, length, and name, and to book only on a clear yes.
- The phone number is the SIP caller ID. If the caller ID is withheld or isn't a valid E.164 number, the agent can still list times but won't book, and it points the caller to nathanpayne.com/book.
- One booking per call. A second attempt is refused.
- The agent asks for an email address only if the caller wants a calendar invite, and spells it back.
- Calendar writes can't be interrupted (`disallow_interruptions()`), and every Cal.com failure, such as a slot that was just taken or a booking limit, becomes a sentence the agent can say.

The Cal.com event type itself carries the rest of the limits: 15 or 30 minutes, at least two hours' notice, a 14-day window, and at most two bookings a day and five a week. Its phone field is required and its email field is optional but **visible**. Cal.com discards the email of an attendee whose event type hides the email field, and books with a phone placeholder (`<digits>@sms.cal.com`), so a hidden field means no caller ever gets an invite. If that happens, the agent logs `cal.com dropped the attendee email`. The event type ID comes from `CAL_EVENT_TYPE_ID` at runtime and isn't stored in the code.

## Free Plan Limits

The agent is sized to stay within LiveKit Cloud's free Build plan. On the Build plan the included allowances are hard caps: once one runs out, new requests fail instead of incurring charges, and allowances reset on the first of each month without rolling over ([quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/)). The limits that matter here, from the [pricing page](https://livekit.com/pricing) and the quotas page:

| Resource | Build Plan Allowance | What It Means for This Agent |
| --- | --- | --- |
| LiveKit Inference credits | $2.50 a month, about 50 minutes at model prices | Roughly 10 full five-minute calls a month across STT, LLM, and TTS. |
| US local inbound minutes | 50 minutes a month, one free local number | The same budget measured on the phone line. |
| Agent session minutes | 1,000 minutes a month | Not the binding limit. |
| Concurrent agent sessions | 5 | At most five calls at once. |
| Agent deployments | 1 | This is the project's only deployed agent. |
| Cold starts | Up to 10 to 20 seconds | A deployed agent can shut down when idle, so the first caller after a quiet period may wait before the greeting. |

The five-minute session cap exists to keep a single call from eating a large share of the monthly inference and phone minutes.

## Local Development

Run everything from this folder. You need [uv](https://docs.astral.sh/uv/) and the [LiveKit CLI](https://docs.livekit.io/intro/basics/cli/) (2.19.0 or later). The project pins Python 3.12 in `.python-version`; `livekit-agents` doesn't support Python 3.15 yet.

```console
uv sync
cp .env.example .env.local
```

Fill in `.env.local`:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: the LiveKit Cloud project. `lk cloud auth` followed by `lk app env --write --destination .env.local` writes them for you.
- `CAL_API_KEY`: a Cal.com API key for Nathan's account.
- `CAL_EVENT_TYPE_ID`: the numeric ID of the Cal.com event type for phone calls.
- `OWNER_TIMEZONE`: optional, defaults to `America/Los_Angeles`.
- `DEV_CALLER_PHONE`: optional, for local testing only. Console mode and the browser Agent Console have no SIP caller, so without this the agent can list times but not book. When set to an E.164 number, it stands in for caller ID in those sessions only; a real SIP call never uses it. Leave it unset in every deployed environment; the agent refuses to start in production mode (`start`) when it is set.

The agent stops at startup with a clear message if the Cal.com settings are missing.

Then run the agent on your machine:

```console
lk agent console    # talk to it in the terminal
lk agent dev        # connect it to LiveKit Cloud and try it in the Agent Console
lk agent debugger start && lk agent debugger say "I'd like to book a call"
```

With LiveKit CLI 2.19.0 or later, `lk agent dev` registers the agent under a random `dev-` deployment, so dev traffic stays apart from production and a phone call to the number never reaches it; it prints an Agent Console link that does. Test by phone against the deployed agent instead (#1565). Don't run `lk agent dev --deployment production`, and check that `LIVEKIT_AGENT_DEPLOYMENT` (which the CLI also reads, including from `.env.local`) is unset or names a non-production deployment: either one serves real callers from your machine.

Before the first run, `uv run src/agent.py download-files` fetches the local model files that plugins use, such as the turn detector's local fallback; the Dockerfile does the same at build time. With real Cal.com settings, a console booking lands on Nathan's real calendar, so cancel test bookings afterward.

## Tests

```console
uv run ruff check
uv run ruff format --check
uv run pytest
```

- `tests/test_calcom.py` checks the Cal.com client against hand-written fixtures served by a local test server: slot parsing, the phone-only booking payload, headers, and error mapping. No test calls Cal.com.
- `tests/test_booking.py`, `tests/test_session_cap.py`, `tests/test_config.py`, and `tests/test_agent.py` cover the booking rules, the five-minute cap on a fake clock, configuration, and caller ID handling.
- `tests/test_session_wiring.py` runs the real agent in an `AgentSession` with a scripted LLM, proving the guards hold inside the SDK without any model calls.
- `tests/test_behavior.py` uses LiveKit Inference with an LLM judge to check that the agent reads a booking back before booking, that a "no" never books, and that a withheld caller ID never books. These tests skip unless `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set; run them with `uv run pytest -m behavior`.

Fixtures use fictional numbers from the 555-0100 to 555-0199 range and contain no API key or event type slug. CI runs Ruff and the test suite on every pull request that touches this folder; the behavior tests skip there.

## Deploy and Operate

The agent runs on LiveKit Cloud as agent `CA_duPLhGiviC5X` in the `us-east` region, in project `nathanpayne-com`. `livekit.toml` in this folder records the project subdomain and agent ID, so the commands below find the agent from this folder. It holds no secrets.

### First Create

The first deploy was one command, run from this folder:

```console
lk agent create --region us-east --secrets-file <file> --yes .
```

`<file>` held three lines: `CAL_API_KEY` (read from 1Password with `op read`), `CAL_EVENT_TYPE_ID`, and `OWNER_TIMEZONE`. It was created with mode 600 outside the repo and deleted right after. Don't set `DEV_CALLER_PHONE`: the agent refuses to start in production with it set. `lk agent create` builds the image from the Dockerfile on LiveKit's build service, starts it, and writes `livekit.toml`. The region can't be changed after creation; the available regions are listed under [regions and endpoints](https://docs.livekit.io/deploy/admin/regions/endpoints/).

### Later Deploys

```console
lk agent deploy
```

Each deploy builds a new version and rolls it out. `lk agent versions` lists versions with their git commit and branch (the CLI records both by default), and `lk agent rollback --version <version>` returns to an earlier one. Secrets carry over between deploys; pass `--secrets` or `--secrets-file` only to change them. How quickly a rollback takes effect on the Build plan is unverified.

### Status and Logs

```console
lk agent status                     # one row per agent: version, region, status, replicas
lk agent logs                       # runtime logs (tails until interrupted)
lk agent logs --log-type build      # image build logs
lk agent versions                   # every version and which one is in production
```

A healthy startup logs `starting worker` followed by `registered worker` with `"agent_name": "receptionist"`. `lk agent logs` tails a single agent instance.

### Rotating the Cal.com Key

Create the new key in Cal.com, then update the secret. This restarts the agent:

```console
lk agent update --secrets-file <file> .
lk agent secrets                    # lists secret names and timestamps, never values
```

Revoke the old key in Cal.com afterward.

### Dispatch Rule

Calls reach the agent through an inbound SIP dispatch rule, `receptionist-inbound` (`SDR_fMK47p98cH36`). It's a callee rule: each call gets its own room, named `call-` plus our own number and a random suffix, and the rule dispatches the agent by name (`receptionist`). Rooms are named after the called number, not the caller, because room names appear in logs and traces without PII redaction ([dispatch rules](https://docs.livekit.io/telephony/accepting-calls/dispatch-rule/)). Inspect it with:

```console
lk sip dispatch list
lk number list                      # the SIP Dispatch Rules column must show SDR_fMK47p98cH36
```

A LiveKit phone number routes calls only to a rule assigned to it ([testing your telephony setup](https://docs.livekit.io/telephony/testing/)). The documented CLI assignment, `lk number update --id PN_PPN_wUSnKQ2hfeNU --sip-dispatch-rule-id <rule>`, failed every time on 2026-11-05 with `twirp error invalid_argument: Failed to update phone number`, on CLI 2.19.3, for both individual and callee rules. Assign the rule in the dashboard instead: Telephony, then Phone numbers, then the number's **⋮** menu, **Configure with existing dispatch rules**, then pick the rule and save. The number is ID `PN_PPN_wUSnKQ2hfeNU`, the 415 number ending in 6465. If you ever replace the rule, assign the new one the same way, or calls stop reaching the agent.

### Checking Usage

The Build plan allowances in [Free Plan Limits](#free-plan-limits) reset on the first of each month. LiveKit Cloud shows the project's quotas under Settings, then the Project tab, and per-session usage under Agent insights ([quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/)). I found no `lk` command that prints the month's inference or telephony totals, so use the dashboard.

### When an Allowance Runs Out

On the Build plan an exhausted allowance is a hard cap: new requests fail instead of incurring charges. The LiveKit docs don't say what a phone caller hears in that case, so that is unverified. Turn detection and interruption handling fall back to local models; the speech, language, and voice models don't have a documented fallback.

## Privacy

A call sends data to three places:

- **LiveKit Cloud** carries the call audio. Audio recording is turned off for every session in code (`record={"audio": False}`). Transcripts, traces, and logs follow the project's agent observability setting and are kept for LiveKit's 30-day retention window.
- **LiveKit Inference providers** process the call to run the voice pipeline: audio goes to the speech-to-text model, the transcript to the LLM, and the agent's replies to the text-to-speech model. LiveKit describes Inference as [zero data retention](https://docs.livekit.io/agents/models/inference/#zero-data-retention).
- **Cal.com** receives a booking's details: the caller's name, phone number from caller ID, time zone, and, only if given, the topic and an email address for the calendar invite.

The site's privacy notice is at [nathanpayne.com/privacy](https://nathanpayne.com/privacy/). The details in this section are being verified in #1566.
