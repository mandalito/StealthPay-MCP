# StealthPay Collaboration Policy

This repository follows these working rules:

1. Align tests with MCP tools.
2. When a bug is detected/fixed, add or update tests to prevent regressions of the same class.
3. Keep documentation synchronized with code behavior (tool names, payloads, constraints, network support).
4. Update `docs/changelog.md` for every code/doc behavior change, and include that changelog update in the same commit.
5. After each code/documentation change:
   - run relevant tests for impacted MCP tools or modules
   - commit with a clear message
   - push to `origin/main`
   - pull/rebase and reconcile if remote changed
6. Keep local-only artifacts under `.local/` (SDK clones, probes, scratch files); never commit `.local/` content.
7. After pulling teammate changes, run a quick docs/code reconciliation pass and update docs when behavior diverges.
8. Private key safety policy (strict):
   - the agent must never request users to paste private keys in chat
   - the agent must never display, log, or echo private keys in tool outputs
   - private keys must be read from local environment/runtime only
   - private keys must never be committed to git, docs, examples, test fixtures, or transcripts
   - if a leak is detected, treat it as a security incident and rotate compromised keys immediately
