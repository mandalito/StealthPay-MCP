# Git Sync Workflow

## Objective

Keep documentation work synchronized with ongoing MCP implementation and tests.

## Local-Only Dependencies

Use `.local/` for SDKs or helper repos that should not be committed.

Example:

```bash
git clone https://github.com/ScopeLift/umbra-protocol .local/umbra-protocol
```

The root `.gitignore` excludes `.local/` from version control.

`.local/` can also contain ad-hoc MCP probe scripts (for example `mcp-*.mjs`) used to test tool calls against `dist/index.js`. Keep them local-only.

## Local Secrets

Persist recipient recovery keys in `.env` (gitignored):

- `RECIPIENT_SPENDING_PRIVATE_KEY`
- `RECIPIENT_SPENDING_PUBLIC_KEY`
- `RECIPIENT_VIEWING_PRIVATE_KEY`
- `RECIPIENT_VIEWING_PUBLIC_KEY`

These values come from `register-stealth-keys` output and are required for scan/derive/claim flows.

## Daily Baseline

```bash
git checkout main
git pull origin main
```

## Feature Branch Workflow

```bash
git checkout -b docs/<short-topic>
# edit docs

git add README.md docs/
git commit -m "docs: <short summary>"

git fetch origin
git rebase origin/main
```

## Before Opening PR

- ensure docs links resolve
- ensure examples still match actual tool names/payloads
- include updates in `docs/changelog.md`

## Conflict Handling

If conflict appears during rebase:

1. Resolve conflicts in docs files only.
2. Run `git add <resolved-files>`.
3. Continue with `git rebase --continue`.
4. Re-run quick link/content sanity check.

## Suggested Cadence (Hackathon)

- pull/rebase at least every 2-3 hours
- sync immediately before major spec edits
- sync immediately before push
