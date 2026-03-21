# Consolidated TODO

Last updated: 2026-03-21T17:33:20+01:00
Owner: documentation track

This file is the single backlog for cross-cutting follow-up work (docs, security, tests, implementation alignment).

## Done (Recent)

- [x] Security audit remediations applied in commit `91659d6`:
  - removed `derive-stealth-key` and `withdraw-from-stealth` from registered MCP tools
  - made `scan-announcements` env-only for keys
  - gated key printing in `test/register-e2e.ts` behind `DEBUG=true`

## P0 - Documentation / API Alignment

- [ ] Reconcile all docs/examples with the current registered MCP endpoints (11 tools):
  - remove `derive-stealth-key` and `withdraw-from-stealth` from endpoint docs where still listed
  - update recipient flow docs to `scan-announcements` + `claim-stealth-payment`
- [ ] Update `docs/examples/mcp-tool-usage.md` to remove key-bearing input examples and show env-only scan usage.
- [ ] Update `docs/flows/agentic-payment-flow.md` to reflect claim-first secure flow.
- [ ] Update `docs/testing/mcp-endpoint-coverage-report.md` to match current endpoint surface.

## P1 - Security Hardening

- [ ] Decide fate of legacy files:
  - `src/tools/derive-stealth-key.ts`
  - `src/tools/withdraw-from-stealth.ts`
  Current status: not registered, but still present in repo.
- [ ] Add a regression test that fails if key-bearing tools are accidentally re-registered in `src/index.ts`.
- [ ] Add a lint/test check that rejects private-key-like strings in docs/examples committed to git.

## P1 - Network / Deployment Clarity

- [ ] Add a small script (or npm task) to re-check `eth_getCode` deployment status for announcer/registry across configured chains.
- [ ] Decide whether `hoodi` should remain in `SUPPORTED_CHAINS` while singleton contracts are not deployed there.
- [ ] Optionally add Sepolia stablecoin symbol mapping in `STABLECOINS` (if token demos require symbol routing).

## P1 - Programmable Payment Profile Schema

- [ ] Implement dual-read parser for ENS keys:
  - read `stealthpay.v1.*` when present
  - fallback to legacy keys (`chain`, `token`, `stealth-meta-address`, etc.)
- [ ] Define validation rules for proposed fields:
  - preferred chain
  - coins list
  - fallback address
  - note requirements and encryption policy

## P2 - Test Strategy

- [ ] Keep deterministic test suites aligned to registered tools only.
- [ ] Add coverage for new env-only `scan-announcements` behavior.
- [ ] Evaluate a Sepolia fork profile for transaction-heavy integration tests.
