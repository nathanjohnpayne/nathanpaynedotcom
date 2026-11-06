---
spec_id: phone-receptionist
title: Phone Receptionist
---

# Phone Receptionist

## Overview

The phone receptionist (#1561) is a voice agent in `receptionist/` that answers the booking line published on `/book/` (specs/book-page.md item 12) and books a 15- or 30-minute phone call with Nathan through the Cal.com API v2. It runs on LiveKit Cloud and is never part of the site build or deploy. This spec states what the shipped agent must do; `receptionist/README.md` is the runbook, and `docs/privacy/inventory.md` § Phone Booking Line is the privacy record. Tests live in `receptionist/tests/` and run with `uv run pytest` from that folder.

## Requirements

### Answering a Call

1. The agent registers under the explicit dispatch name `receptionist` (`AGENT_NAME` in `src/agent.py`), which the LiveKit SIP dispatch rule names.
2. It opens with the fixed `GREETING` in `src/prompts.py`. The greeting says that it is Nathan Payne's AI receptionist, that the call is transcribed by AI and the transcript is kept for 30 days, that the audio isn't recorded, and that it can book a 15- or 30-minute call. `/privacy/` states the same retention.
3. The only phone number it books with is the SIP caller ID. If caller ID is withheld or isn't a valid E.164 number, it can list times but never books, and it points the caller to nathanpayne.com/book. No tool takes a phone number or an email address as an argument.
4. Every call ends by five minutes: at 4:30 the agent says a short goodbye with the booking status, and at 5:00 it hangs up, even if the goodbye fails or runs long.
5. Asked how it was built, it says `BUILD_ANSWER`, and, if asked which models, `MODELS_ANSWER` (both in `src/prompts.py`), then offers to book. `MODELS_ANSWER` names the models the agent runs. It declines other questions about Nathan.
6. The voice says "LiveKit" through Arpabet phoneme tags applied as a text-to-speech transform, so the word is pronounced right and transcripts keep the spelling.

### Booking

7. A booking uses only a slot offered earlier in the same call, at the length it was offered for.
8. A booking needs a review of the same details first, and the caller must speak after that review. A "no" to the read-back never books.
9. A call makes at most one booking.
10. The agent asks for an email address only when the caller wants a calendar invite, through LiveKit's `GetEmailTask`, and spells it back.
11. Bookings send `cal-api-version: 2026-02-25`. Each Cal.com failure becomes a sentence the agent can say, mapped from the responses captured live on 2026-11-06: a taken slot or a start beyond the window (409) is "slot unavailable", a reached booking limit (401 with a booking-limit message) is "booking limit", a start inside the notice period (400) is "booking window", a bad key or a server failure is "calendar unavailable", and anything else is a generic failure. A write that may have reached Cal.com but wasn't confirmed is reported as unconfirmed, never as a failure.

### Analytics and Configuration

12. With `POSTHOG_PROJECT_TOKEN` set, the agent sends the six `receptionist_*` events in specs/analytics.md § Phone Receptionist Events, with only their allowlisted properties and a random per-call ID, and none of the caller's details.
13. A call from `OWNER_PHONE`, and any session without a SIP caller, is flagged as an internal test; the owner's number is compared in the agent and never sent.
14. Analytics never stop the agent or a call: a missing token, a malformed `OWNER_PHONE` or `POSTHOG_HOST`, a PostHog client that fails to start, or a `posthog` package that fails to import turns analytics off.
15. The agent refuses to start without its Cal.com settings, and refuses to start in production mode with `DEV_CALLER_PHONE` set.

## Testing

`receptionist/tests/` covers these requirements: `test_agent.py` (items 1–3, 5, 6, 13–15), `test_session_cap.py` (item 4), `test_booking.py` and `test_session_wiring.py` (items 3, 7–10), `test_behavior.py` (items 5 and 8, with LiveKit Inference and an LLM judge; skipped without LiveKit credentials), `test_calcom.py` (item 11), `test_analytics.py` (item 12), and `test_config.py` (items 14 and 15). `tests/privacy-ui.test.js` checks that the greeting and `/privacy/` state the same retention (item 2).
