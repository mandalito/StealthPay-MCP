# MCP Endpoint Coverage Report

Generated: 2026-03-22T08:30:00+01:00
Branch: main

## Scope

Audit of test alignment between currently registered MCP tools and `test/` suite.

## Registered MCP Tools (from `src/index.ts`)

1. `get-my-profile`
2. `generate-wallet`
3. `get-balances`
4. `register-ens-name`
5. `register-stealth-keys`
6. `set-profile`
7. `get-payment-profile`
8. `generate-stealth-address`
9. `send-stealth-payment`
10. `create-payment-link`
11. `scan-announcements`
12. `claim-stealth-payment`

## Deterministic MCP Endpoint Test Files

### Tool handler tests (`test/tools/`)

- `test/tools/get-my-profile.test.ts`
- `test/tools/generate-wallet.test.ts`
- `test/tools/get-balances.test.ts`
- `test/tools/register-ens-name.test.ts`
- `test/tools/register-stealth-keys.test.ts`
- `test/tools/get-payment-profile.test.ts`
- `test/tools/generate-stealth-address.test.ts`
- `test/tools/send-stealth-payment.test.ts`
- `test/tools/create-payment-link.test.ts`
- `test/tools/scan-announcements.test.ts`
- `test/tools/claim-stealth-payment.test.ts`

### Cross-cutting test files

- `test/tools/registered-tools.test.ts` — ensures exactly the 12 allowed tools are registered and key-bearing legacy tools stay unregistered
- `test/tools/policy.test.ts` — agent spend policy engine (per-tx caps, daily limits, chain/token/destination allowlists, signed updates, audit logging)
- `test/tools/no-secrets-in-docs.test.ts` — scans docs/ and examples/ for private-key-like hex strings
- `test/tools/profile-schema-validation.test.ts` — validates JSON Schema matches TypeScript types and PROFILE_DEFAULTS
- `test/tools/profile-migration.test.ts` — canonical key precedence over legacy, CAIP validation, policy enum validation, dual-write consistency

### Library-level tests

- `test/stealth.test.ts` — stealth address math
- `test/payments.test.ts` — payment links, ERC-681 URIs
- `test/note-encryption.test.ts` — encrypted notes (baseline + dual-envelope mode, round-trip encrypt/decrypt)

### Regression Coverage

- `test/ens-register.receipt.test.ts` — ENS registration receipt handling

## Current Test Commands

- `npm test`
  - Runs deterministic test suite (unit + tool-handler tests)
  - Excludes `*.integration.test.ts` by default
- `npm run test:tools`
  - Runs MCP endpoint handler tests only (`test/tools`)
- `npm run test:ens`
  - Runs ENS live integration test (network-dependent)
- `npm run test:fork`
  - Runs fork-backed integration profile (`test/fork/sepolia-fork.integration.test.ts`)
  - Uses `SEPOLIA_FORK_URL` (or `RPC_URL` fallback) as fork upstream

## Sepolia Fork Recommendation

Yes, a Sepolia fork is a good next layer for catching production-like bugs earlier.

Recommended strategy:

1. Keep `test/tools/*` as fast deterministic contract tests (run on every change).
2. Keep `test/tools/registered-tools.test.ts` as a policy guard against accidental re-registration of forbidden key-bearing endpoints.
3. Add fork-backed integration tests for transaction-heavy paths (`register-ens-name`, `register-stealth-keys`, `send-stealth-payment`, `claim-stealth-payment`).
4. Run fork tests in CI on demand (or nightly), not on every commit.

Benefits:

- deterministic state snapshots
- realistic RPC + contract behavior
- no dependency on public RPC instability for default test runs
