# bootstrap-config.sh — Repo-specific 1Password mappings
#
# Two patterns supported:
#
# 1. INJECT_FILES (preferred): `.env.tpl` files containing op:// references
#    resolved by `op inject`. Each entry: "template/path:output/path"
#    (both relative to repo root). Secrets stay in 1Password; only the
#    template ships in git.
#
# 2. BOOTSTRAP_FILES (legacy): whole-file contents stored in a 1Password
#    Secure Note's `notesPlain` field. Each entry:
#    "1password_item_id:relative_file_path"
#    Use only when a file can't easily be expressed as a template of
#    op:// references.

INJECT_FILES=(
  ".env.tpl:.env.local"
)

BOOTSTRAP_FILES=(
)
