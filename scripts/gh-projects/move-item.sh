#!/usr/bin/env bash
# Move a GitHub Project v2 item (by issue number) to a named Status swimlane.
#
# Usage:
#   PROJECT=5 OWNER=nathanjohnpayne REPO=nathanjohnpayne/nathanpaynedotcom \
#     GH_TOKEN="$(op read ...)" ./move-item.sh <issue_number> <status_name>
#
# <status_name> is the human-readable option name: Todo, In Progress, In Review,
# Human, Done (or whatever options exist on the project's Status field).
#
# The script discovers the project's node ID, Status field ID, and option IDs
# at runtime, so it works with any Project v2 that has a Status field.

set -euo pipefail

ISSUE_NUM="${1:?issue number required}"
STATUS_NAME="${2:?status name required}"

: "${REPO:?REPO must be set (owner/repo)}"
: "${OWNER:?OWNER must be set}"
: "${PROJECT:?PROJECT must be set}"

ISSUE_URL="https://github.com/$REPO/issues/$ISSUE_NUM"
export ISSUE_URL STATUS_NAME

# Discover project id + Status field + option id for the requested status.
read -r PROJECT_ID STATUS_FIELD_ID OPT_ID <<<"$(gh project field-list "$PROJECT" --owner "$OWNER" --format json | python3 -c "
import json, sys, os
d = json.load(sys.stdin)
status_name = os.environ['STATUS_NAME']
project_id = None
field_id = None
opt_id = None
for f in d.get('fields', []):
    if f.get('name') == 'Status':
        field_id = f['id']
        for o in f.get('options', []):
            if o.get('name') == status_name:
                opt_id = o['id']
                break
# Project id — any field's projectId; gh exposes it on the field object in some versions, else query separately
" )"

# The field-list shape doesn't always expose project id; fetch it via project view.
PROJECT_ID=$(gh project view "$PROJECT" --owner "$OWNER" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

STATUS_FIELD_ID=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json | python3 -c "
import json, sys
d = json.load(sys.stdin)
for f in d.get('fields', []):
    if f.get('name') == 'Status':
        print(f['id']); break
")

OPT_ID=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json | python3 -c "
import json, sys, os
d = json.load(sys.stdin)
name = os.environ['STATUS_NAME']
for f in d.get('fields', []):
    if f.get('name') == 'Status':
        for o in f.get('options', []):
            if o.get('name') == name:
                print(o['id']); break
")

if [ -z "$PROJECT_ID" ] || [ -z "$STATUS_FIELD_ID" ] || [ -z "$OPT_ID" ]; then
  echo "failed to resolve project/field/option IDs (PROJECT_ID=$PROJECT_ID, STATUS_FIELD_ID=$STATUS_FIELD_ID, OPT_ID=$OPT_ID)" >&2
  exit 1
fi

# Find the project-item id for this issue.
ITEM_ID=$(gh project item-list "$PROJECT" --owner "$OWNER" --format json --limit 200 | python3 -c "
import json, sys, os
url = os.environ['ISSUE_URL']
d = json.load(sys.stdin)
for it in d.get('items', []):
    content = it.get('content') or {}
    if content.get('url') == url:
        print(it['id']); break
")

if [ -z "$ITEM_ID" ]; then
  echo "could not find project item for $ISSUE_URL" >&2
  exit 1
fi

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$OPT_ID" > /dev/null

echo "moved #$ISSUE_NUM to '$STATUS_NAME'"
