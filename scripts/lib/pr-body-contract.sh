#!/usr/bin/env bash
# Shared parser for the identity-bearing fields in pull request bodies.

pr_body_authoring_agent() {
  printf '%s\n' "$1" | awk '
    {
      lower = tolower($0)
      if (lower ~ /^[[:space:]]*authoring-agent:[[:space:]]*/) {
        value = $0
        sub(/^[[:space:]]*[Aa][Uu][Tt][Hh][Oo][Rr][Ii][Nn][Gg]-[Aa][Gg][Ee][Nn][Tt]:[[:space:]]*/, "", value)
        sub(/[[:space:]]+$/, "", value)
        if (value ~ /^[A-Za-z0-9_-]+$/) {
          print tolower(value)
          exit
        }
      }
    }
  '
}

pr_body_has_self_review() {
  printf '%s\n' "$1" | awk '
    tolower($0) ~ /^## self-review[[:space:]]*$/ { found = 1 }
    END { exit(found ? 0 : 1) }
  '
}

pr_body_validate() {
  local body=$1
  local author
  local failed=0

  author="$(pr_body_authoring_agent "$body")"
  if [ -z "$author" ]; then
    echo "PR description is missing a valid 'Authoring-Agent:' line (expected one agent identifier)." >&2
    failed=1
  fi

  if ! pr_body_has_self_review "$body"; then
    echo "PR description is missing a '## Self-Review' section." >&2
    failed=1
  fi

  [ "$failed" -eq 0 ]
}
