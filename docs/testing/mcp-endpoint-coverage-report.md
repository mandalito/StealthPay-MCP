# MCP Endpoint Coverage Report

Generated: 2026-03-21T16:26:50+01:00
Branch: main

## Scope

Audit of test alignment between currently registered MCP tools and `test/` suite.

## Registered MCP Tools (from `src/index.ts`)

1. `get-my-profile`
2. `generate-wallet`
3. `get-balances`
4. `register-ens-name`
5. `register-stealth-keys`
6. `get-payment-profile`
7. `generate-stealth-address`
8. `send-stealth-payment`
9. `create-payment-link`
10. `scan-announcements`
11. `derive-stealth-key`
12. `withdraw-from-stealth`
13. `claim-stealth-payment`

## Alignment Status

Before this pass, coverage was mostly at lib/E2E level (`stealth.test.ts`, `payments.test.ts`, integration scripts) and did not systematically validate MCP tool handlers.

After this pass, each MCP endpoint has a dedicated unit test file:

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
- `test/tools/derive-stealth-key.test.ts`
- `test/tools/withdraw-from-stealth.test.ts`
- `test/tools/claim-stealth-payment.test.ts`

## Regression Coverage Added

A dedicated regression test now guards ENS registration receipt handling:

- `test/ens-register.receipt.test.ts`

This checks that `registerEnsName` throws when commit/register receipts are reverted, preventing false “success” responses.

## Current Test Commands

- `npm test`
  - Runs deterministic test suite (unit + tool-handler tests)
  - Excludes `*.integration.test.ts` by default
- `npm run test:tools`
  - Runs MCP endpoint handler tests only (`test/tools`)
- `npm run test:ens`
  - Runs ENS live integration test (network-dependent)

## Sepolia Fork Recommendation

Yes, a Sepolia fork is a good next layer for catching production-like bugs earlier.

Recommended strategy:

1. Keep `test/tools/*` as fast deterministic contract tests (run on every change).
2. Add fork-backed integration tests for transaction-heavy paths (`register-ens-name`, `register-stealth-keys`, `send-stealth-payment`, `claim-stealth-payment`).
3. Run fork tests in CI on demand (or nightly), not on every commit.

Benefits:

- deterministic state snapshots
- realistic RPC + contract behavior
- no dependency on public RPC instability for default test runs
