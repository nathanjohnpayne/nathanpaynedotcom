---
title: PostHog Setup - Conclusion
description: Review and fix any errors in the PostHog integration implementation
---

Use the PostHog MCP to create a new dashboard named "Analytics basics (agent)" based on the events created here. Keep the `(agent)` tag with that exact casing so anyone browsing PostHog can see the agent created this dashboard, and so a quick search for `(agent)` surfaces every agent-created artifact in one go. Make sure to use the exact same event names as implemented in the code. Populate it with up to five insights, with special emphasis on things like conversion funnels, churn events, and other business critical insights.

Search for a file called `.posthog-events.json` and read it for available events.

Do not spawn subagents.

Create the file `posthog-setup-report.md`. It should include a summary of the integration edits, a table with the event names, event descriptions, and files where events were added, along with a list of links for the dashboard and insights created. Follow this format:

<posthog-setup-report>
# PostHog integration report

[Detailed summary of PostHog integration changes]

## Instrumented events

[table of events, descriptions, and files]

## Next steps

Review the dashboard and insights created from the newly instrumented events:

[links]

### Agent skill

This project now includes a PostHog integration skill folder. Use it as local context for future agent work on this integration.

</posthog-setup-report>

Upon completion, remove .posthog-events.json.

## Status

Status to report in this phase:

- Configured dashboard: [insert PostHog dashboard URL]
- Created setup report: [insert full local file path]
