# Consolidated TODO

Last updated: 2026-03-22T07:34:00+01:00
Owner: documentation track

This file is the single backlog for cross-cutting follow-up work (docs, security, tests, implementation alignment).

## Done (Recent)

- [x] Added payment-profile standards alignment audit:
  - `docs/audits/2026-03-22-payment-profile-standards-alignment-report.md`
  - clarified ENS data model: text records are flat key/value; thematic grouping must use namespaced keys (not nested categories)
- [x] Security audit remediations applied in commit `91659d6`:
  - removed `derive-stealth-key` and `withdraw-from-stealth` from registered MCP tools
  - made `scan-announcements` env-only for keys
  - gated key printing in `test/register-e2e.ts` behind `DEBUG=true`
- [x] P0 doc reconciliation pass completed:
  - updated examples/flows/specs/testing docs for 11 registered endpoints
  - removed key-bearing endpoint usage examples from docs
- [x] P2 deterministic test alignment improvements:
  - endpoint coverage report updated to current tool surface
  - added env-only override guard test for `scan-announcements`
- [x] Fork integration profile implemented:
  - added `test/fork/sepolia-fork.integration.test.ts`
  - added `npm run test:fork` and dedicated `vitest.fork.config.ts`
- [x] Deployment re-check automation added:
  - added `npm run check:deployments` (`scripts/check-deployments.mjs`)

## P0 - Documentation / API Alignment

- [x] Reconcile all docs/examples with the current registered MCP endpoints (11 tools):
  - remove `derive-stealth-key` and `withdraw-from-stealth` from endpoint docs where still listed
  - update recipient flow docs to `scan-announcements` + `claim-stealth-payment`
- [x] Update `docs/examples/mcp-tool-usage.md` to remove key-bearing input examples and show env-only scan usage.
- [x] Update `docs/flows/agentic-payment-flow.md` to reflect claim-first secure flow.
- [x] Update `docs/testing/mcp-endpoint-coverage-report.md` to match current endpoint surface.

## P1 - Security Hardening

- [x] Decide fate of legacy files:
  - `src/tools/derive-stealth-key.ts`
  - `src/tools/withdraw-from-stealth.ts`
  Current status: deleted from repository; forbidden by registered-tools policy test.
- [x] Add a regression test that fails if key-bearing tools are accidentally re-registered in `src/index.ts`.
- [ ] Add a lint/test check that rejects private-key-like strings in docs/examples committed to git.
- [ ] Implement agent risk limits for transaction execution:
  - evaluate Account Abstraction guard patterns (ERC-4337 / smart account policy modules)
  - add MCP-native policy controls (per-tx caps, daily spend limits, token/chain allowlists, destination allowlists)
- [ ] Enforce policy immutability from the agent path:
  - do not expose any MCP tool that can modify limits or policy state
  - enforce policy checks on every tx path (`send-stealth-payment`, claim/withdraw execution paths)
  - keep policy storage writable only by operator/admin context (not by agent/runtime call path)
- [ ] Add signed policy-governance model (separate from spend keys):
  - require policy updates to be signed artifacts verified by a pinned policy-admin public key
  - use a dedicated policy-admin key (or multisig/hardware signer), not the sender spending key
  - include policy versioning + effective time + rollback protection
  - add audit logging for accepted/rejected policy update attempts

## P1 - Network / Deployment Clarity

- [x] Add a small script (or npm task) to re-check `eth_getCode` deployment status for announcer/registry across configured chains.
- [x] Decide whether `hoodi` should remain in `SUPPORTED_CHAINS` while singleton contracts are not deployed there.
  Decision: keep `hoodi` listed for forward compatibility, but treat as non-operational for stealth payment flows until singleton contracts are deployed.
- [ ] Optionally add Sepolia stablecoin symbol mapping in `STABLECOINS` (if token demos require symbol routing).

## P1 - Programmable Payment Profile Schema

- [ ] Freeze namespaced ENS key strategy for payment profile fields:
  - choose canonical prefix (recommended: `io.stealthpay.payments.*`)
  - keep a migration/alias policy for existing proposal keys (`stealthpay.v1.*`) and legacy keys
  - document explicitly that ENS grouping is via namespaced flat keys, not nested objects
- [ ] Implement dual-read parser for ENS keys:
  - read canonical namespaced keys first
  - fallback to existing proposed keys (`stealthpay.v1.*`) if retained
  - fallback to legacy keys (`chain`, `token`, `stealth-meta-address`, `description`)
- [ ] Implement dual-write in `set-profile` during migration window:
  - write canonical namespaced keys
  - optionally mirror legacy keys for backwards compatibility
- [ ] Normalize profile values to standards-oriented identifiers:
  - chain IDs as CAIP-2
  - account IDs as CAIP-10 (for transparent fallback accounts)
  - asset IDs as CAIP-19 (with user-friendly alias resolution)
- [ ] Add explicit stealth policy field and enforcement in send flows:
  - enum: `required | preferred | optional | disabled`
  - treat capability (`stealth meta-address exists`) separately from policy
- [ ] Define and validate note policy fields:
  - `note_policy`, `note_format`, `note_max_bytes`, `note_privacy`
  - avoid assuming universal on-chain memo support across assets
- [ ] Add ERC-681 output mode to `create-payment-link` and make it default for interoperability:
  - keep current custom HTTPS link format as optional app-specific wrapper
- [ ] Publish machine-readable payment profile schema (JSON Schema) and use it for parser/tool validation.

## P2 - Test Strategy

- [x] Keep deterministic test suites aligned to registered tools only.
- [x] Add coverage for new env-only `scan-announcements` behavior.
- [x] Evaluate a Sepolia fork profile for transaction-heavy integration tests.
- [ ] Add tests for profile migration behavior:
  - canonical key precedence over legacy keys
  - dual-write consistency checks
  - strict validation failures for malformed CAIP IDs and policy enums
