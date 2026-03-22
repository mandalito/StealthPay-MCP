# Consolidated TODO

Last updated: 2026-03-22T08:48:11+01:00
Owner: documentation track

This file is the single backlog for cross-cutting follow-up work (docs, security, tests, implementation alignment).

## Done (Recent)

- [x] Test alignment follow-up completed:
  - fixed `npm run test:ens` to use a dedicated integration Vitest config
  - made the ENS live integration suite require explicit `ENS_RPC_URL` to avoid public-RPC rate-limit flake
  - added direct `test/tools/set-profile.test.ts` coverage for policy guard + dual-write behavior
  - reconciled testing/docs references to the current 12-tool MCP surface
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
- [x] Security hardening — full policy engine implemented:
  - `src/lib/policy.ts`: per-tx caps, daily spend limits, token/chain/destination allowlists
  - policy checks enforced on `send-stealth-payment` and `claim-stealth-payment`
  - signed policy-governance model with `POLICY_ADMIN_ADDRESS`, version monotonicity, rollback protection
  - `POLICY_IMMUTABLE` guard on `set-profile` blocks policy field changes from agent path
  - audit logging for all policy events (load, check, update accept/reject)
  - `test/tools/policy.test.ts` with full coverage
- [x] Encrypted notes implemented:
  - `src/lib/note-encryption.ts`: ChaCha20-Poly1305 with ECDH key derivation
  - baseline mode: encrypt with recipient `viewPub`-derived shared secret
  - dual-envelope mode: wrap CEK for both `spendPub` and `viewPub` paths
  - integrated into `sendToStealth` — respects recipient `notePrivacy` preference
  - `test/note-encryption.test.ts` with encrypt/decrypt round-trip tests for both modes
- [x] Sepolia stablecoin mapping added (USDC, DAI, USDT)
- [x] ENS key namespace frozen as `stealthpay.v1.*` — spec updated at `docs/specifications/ens-text-record-keys.md`
- [x] JSON Schema published at `schemas/payment-profile.schema.json`
  - `test/tools/profile-schema-validation.test.ts` validates schema matches TypeScript types
- [x] Profile migration tests added:
  - `test/tools/profile-migration.test.ts`: canonical key precedence, CAIP validation, policy enum validation, dual-write consistency
- [x] Lint check for private-key-like strings in docs/examples:
  - `test/tools/no-secrets-in-docs.test.ts` scans all docs/ for 0x + 64-hex patterns

## P0 - Documentation / API Alignment

- [x] Reconcile all docs/examples with the current registered MCP endpoints (13 tools):
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
- [x] Add a lint/test check that rejects private-key-like strings in docs/examples committed to git.
  Implementation: `test/tools/no-secrets-in-docs.test.ts`
- [x] Implement agent risk limits for transaction execution:
  - MCP-native policy controls in `src/lib/policy.ts` (per-tx caps, daily spend limits, token/chain/destination allowlists)
  - ERC-4337 paymaster noted as future enhancement in `src/lib/withdraw.ts`
- [x] Enforce policy immutability from the agent path:
  - `POLICY_IMMUTABLE=true` env var blocks policy field changes via `set-profile`
  - policy checks enforced on both `send-stealth-payment` and `claim-stealth-payment` tx paths
  - policy storage writable only via env vars or signed policy updates (operator context)
- [x] Add signed policy-governance model (separate from spend keys):
  - `POLICY_ADMIN_ADDRESS` env var pins the policy-admin public key
  - `applySignedPolicyUpdate()` verifies EIP-191 signatures against the admin key
  - version monotonicity enforced (rollback protection)
  - `effectiveAt` timestamp validation
  - audit logging for accepted/rejected policy update attempts

## P1 - Network / Deployment Clarity

- [x] Add a small script (or npm task) to re-check `eth_getCode` deployment status for announcer/registry across configured chains.
- [x] Decide whether `hoodi` should remain in `SUPPORTED_CHAINS` while singleton contracts are not deployed there.
  Decision: keep `hoodi` listed for forward compatibility, but treat as non-operational for stealth payment flows until singleton contracts are deployed.
- [x] Optionally add Sepolia stablecoin symbol mapping in `STABLECOINS` (if token demos require symbol routing).
  Implementation: added USDC, DAI, USDT addresses for Sepolia in `src/config.ts`

## P1 - Programmable Payment Profile Schema

- [x] Freeze namespaced ENS key strategy for payment profile fields:
  - canonical prefix: `stealthpay.v1.*` (frozen — `io.stealthpay.payments.*` evaluated and rejected)
  - migration/alias policy documented in `docs/specifications/ens-text-record-keys.md`
  - ENS grouping is via namespaced flat keys, not nested objects
- [x] Implement dual-read parser for ENS keys:
  - read canonical namespaced keys first
  - fallback to existing proposed keys (`stealthpay.v1.*`) if retained
  - fallback to legacy keys (`chain`, `token`, `stealth-meta-address`, `description`)
- [x] Implement dual-write in `set-profile` during migration window:
  - write canonical namespaced keys
  - optionally mirror legacy keys for backwards compatibility
- [x] Normalize profile values to standards-oriented identifiers:
  - chain IDs as CAIP-2
  - account IDs as CAIP-10 (for transparent fallback accounts)
  - asset IDs as CAIP-19 (with user-friendly alias resolution)
- [x] Add explicit stealth policy field and enforcement in send flows:
  - enum: `required | preferred | optional | disabled`
  - treat capability (`stealth meta-address exists`) separately from policy
- [x] Define and validate note policy fields:
  - `note_policy`, `note_format`, `note_max_bytes`, `note_privacy`
  - avoid assuming universal on-chain memo support across assets
- [ ] Implement deterministic stealth key fallback to reduce local key sprawl:
  - if explicit stealth private keys are configured, use them as source of truth
  - if not configured, derive stealth spending/viewing private keys deterministically from the account private key (domain-separated labels, versioned derivation)
  - derive in-memory at runtime by default (avoid persisting extra local key files)
- [ ] Commit/reconcile derived stealth public meta-address on-chain and profile-linked:
  - register/update ERC-6538 key material when derivation fallback is used
  - mirror resolver profile linkage in ENS text record strategy (during migration period)
  - avoid unnecessary writes when on-chain profile already matches derived public keys
- [x] Implement encrypted notes using existing stealth meta keys (no new key types):
  - baseline mode: encrypt notes with recipient `viewPub`-derived shared secret (ChaCha20-Poly1305 + HKDF-SHA256)
  - sender keeps decrypt capability via stored ephemeral private key
  - ciphertext envelope format: `[version][ephPubX][nonce][ciphertext+tag]`
  - integrated into `sendToStealth` — respects `notePrivacy` profile field
- [x] Evaluate optional dual-envelope mode for note access with `spendPriv OR viewPriv`:
  - implemented in `encryptNoteDualEnvelope` / `decryptNoteWithSpendKey`
  - wraps a random content key (CEK) for both spending and viewing key paths
  - optional; default mode remains view-key-based encryption (baseline)
- [x] Make MCP read receiver note preferences from ENS payment profile before composing requests:
  - respect whether notes are preferred/required/optional/disabled
  - enforce note constraints (`max bytes`, privacy/encryption expectations)
  - expose clear user-facing behavior when recipient policy conflicts with sender input
- [x] Add ERC-681 output mode to `create-payment-link` and make it default for interoperability:
  - keep current custom HTTPS link format as optional app-specific wrapper
- [x] Publish machine-readable payment profile schema (JSON Schema) and use it for parser/tool validation.
  Implementation: `schemas/payment-profile.schema.json` + `test/tools/profile-schema-validation.test.ts`

## P2 - Test Strategy

- [x] Keep deterministic test suites aligned to registered tools only.
- [x] Add coverage for new env-only `scan-announcements` behavior.
- [x] Evaluate a Sepolia fork profile for transaction-heavy integration tests.
- [x] Add tests for profile migration behavior:
  - canonical key precedence over legacy keys
  - dual-write consistency checks
  - strict validation failures for malformed CAIP IDs and policy enums
  Implementation: `test/tools/profile-migration.test.ts`
- [ ] Add tests for deterministic stealth derivation fallback:
  - explicit stealth key config takes precedence over derived fallback
  - stable deterministic outputs for spend/view pubkeys across restarts
  - no account private key recovery path from published derived public metadata
  - no-op on-chain reconciliation when registry/profile already matches derived keys
- [ ] Add direct unit coverage for `src/lib/withdraw.ts`:
  - ETH max-withdraw path subtracts gas buffer correctly
  - insufficient gas / insufficient requested ETH errors stay stable
  - ERC-20 withdrawal path validates token balance and transfer amount handling
