# AGENTS.md

This is a LiveKit Agents project, adapted from LiveKit's `agent-starter-python` template: a phone receptionist that books calls with Nathan Payne through the Cal.com API. LiveKit Agents is a Python SDK for building voice AI agents. This project runs on LiveKit Cloud. See @README.md for how the agent works, its limits, and how to run it.

## Tooling

This Python project uses the `uv` package manager.

Be sure to maintain code formatting, using `uv run ruff format` and `uv run ruff check`.

## LiveKit Documentation

Always refer to the latest documentation when working with this project. LiveKit offers both a CLI (`lk docs`) and an MCP server for browsing and searching its documentation.

### LiveKit CLI

Install or update the CLI:

- **macOS:** `brew install livekit-cli` (update: `brew update && brew upgrade livekit-cli`)
- **Linux:** `curl -sSL https://get.livekit.io/cli | bash`
- **Windows:** `winget install LiveKit.LiveKitCLI` (update: `winget upgrade LiveKit.LiveKitCLI`)

Run `lk docs` before your first docs lookup. Its help text explains how to use each command and how to interpret results.

### LiveKit Docs MCP Server

For deeper coding agent integration, LiveKit also offers an [MCP server](https://docs.livekit.io/reference/developer-tools/docs-mcp/).

### Submit Feedback to LiveKit

When you run into any problem with LiveKit, add it to your to-do list, then submit it with `lk docs submit-feedback` or the MCP `submit_docs_feedback` tool once you finish your other tasks. Useful feedback includes incomplete documentation, broken examples, missing steps, broken features or implementations, and any other gap or issue in the LiveKit ecosystem.

## LiveKit Agent Skills

LiveKit publishes agent skills for each stage of the work: reading the docs, building, debugging, testing, writing scenarios, running simulations, and operating in production. They defer to the live documentation for API details. Before you start a task, check that they're installed: look for `.agents/skills/` or `.claude/skills/` in this project, or in the developer's home directory for a global install. If they're missing, install them with `lk skills install --yes`, which installs them for the coding agents it detects and adds the LiveKit Docs MCP server to their config. If you can't run commands, or the CLI has no `skills` command (it was added in v2.19.0), ask the developer to update the CLI and run `lk skills install`. If your tool doesn't load skills automatically, or they were installed after this session started, read the matching `SKILL.md` (for example `.agents/skills/<name>/SKILL.md`) before you start that kind of task.

## Handoffs and Tasks ("Workflows")

Voice AI agents are highly sensitive to latency. Design complex agents in a structured way that keeps irrelevant context and unneeded tools out of each LLM request. LiveKit Agents supports handoffs, where one agent hands control to another, and tasks, which are tightly scoped prompts that achieve a specific outcome, for building reliable workflows. Use them instead of long instruction prompts that cover several phases of a conversation. See the [workflows documentation](https://docs.livekit.io/agents/logic/workflows/) for more information.

## Testing

Run `uv run pytest`. The suite has three layers:

- Unit tests for the Cal.com client (`tests/test_calcom.py`), the booking rules (`tests/test_booking.py`), the session cap, the configuration, and call analytics (`tests/test_analytics.py`). They use fixtures in `tests/fixtures/` and a local test server, never the live Cal.com API. The Cal.com booking and error fixtures are real responses captured on 2026-11-06 with every personal value replaced; to refresh one, capture it from the live API, scrub it the same way, and cancel any booking the capture created.
- Offline session tests (`tests/test_session_wiring.py`) that run the real agent and tools in an `AgentSession` driven by a scripted LLM, so the booking guards are proven inside the SDK without model calls.
- Behavior tests (`tests/test_behavior.py`) that use LiveKit Inference and an LLM judge. They skip unless `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set; run them with `uv run pytest -m behavior`.

Important: when you modify core agent behavior such as instructions, tool descriptions, or the booking rules, never guess at what works. Add or update a test for the desired behavior first, then iterate until it passes. Fixtures and tests must never contain the Cal.com key, a real phone number (use the fictional 555-0100 to 555-0199 range), or the event type slug.

After changing the agent, try it with the [agent debugger](https://docs.livekit.io/testing/debugger/) (CLI 2.18.8 or later) before calling the change done. Start the agent with `lk agent debugger start`, send user turns with `lk agent debugger say "..."`, and read the tool calls in each turn as well as the reply. Run `lk agent debugger restart` after every code edit, since a running session keeps the old code, and `lk agent debugger stop` when you're done.

## Debugging

To investigate unexpected agent behavior:

- Reproduce it with `lk agent debugger`: send the turns that trigger the problem and read the tool calls and errors in each one. Add `--logs` to `say` to see log lines, including tracebacks, next to the turn that produced them.
- Add a test once it's fixed, so a later change can't bring it back unnoticed.
- Run `lk agent dev --log-level DEBUG` for verbose logs from a local agent connected to LiveKit Cloud.
- Run `lk agent logs` to stream logs from a deployed agent.
- Ask the developer to open the [Agent Console](https://docs.livekit.io/testing/agent-console/) for speech problems such as turn-taking, interruptions, or transcription, which the text-only debugger can't show. It shows events, tool calls, and model timing for a live session.
- Check [Agent Observability](https://docs.livekit.io/testing/observability/) for transcripts, traces, logs, and recordings of sessions with real users.

## Other CLI Commands

Beyond documentation access, the LiveKit CLI (`lk`) handles tasks such as managing SIP trunks for telephony agents. Run `lk --help` to explore available commands.
