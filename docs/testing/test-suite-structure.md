# Test Suite Structure

## Why Some Files in `test/` Are Not `*.test.ts`

Files like:

- `test/ens-e2e.ts`
- `test/register-e2e.ts`
- `test/testnet-e2e.ts`

are executable scenario scripts, not Vitest unit test files.

## Role by Category

### `*.test.ts` files

- deterministic automated tests run by Vitest
- include unit tests and MCP tool-contract tests
- include a tool-surface guard (`test/tools/registered-tools.test.ts`) to ensure only the 12 allowed MCP endpoints are registered
- include cross-cutting tests: policy engine, profile migration, schema validation, secrets-in-docs lint
- include library tests: stealth math, payment links, note encryption
- suitable for default CI/local regression checks

### `*-e2e.ts` files

- manual or semi-manual integration runners executed with `tsx`
- often require funded wallets and live RPC/network state
- used for full workflow validation and demos

### `*.integration.test.ts` fork profile

- on-demand integration profile for fork-based scenarios
- run with `npm run test:fork`
- designed for transaction-heavy flows without impacting default deterministic suite

## Are E2E Script Files Required?

- Not required for `npm test` pass/fail.
- Useful for real-chain end-to-end validation before demos/releases.
- They act as operational test utilities, not core deterministic test contracts.

## Recommended Usage

1. Keep endpoint/unit tests (`*.test.ts`) as mandatory regression baseline.
2. Keep endpoint tests aligned to currently registered tools from `src/index.ts`.
3. Run E2E scripts when validating real Sepolia flows or integration readiness.
