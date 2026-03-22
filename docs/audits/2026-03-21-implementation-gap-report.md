# Implementation Gap Report

Generated: 2026-03-21T13:11:00+01:00
Branch: main

## Short Answer: Sepolia Availability

Based on source/deployment configs, both Umbra and ENS are available on Sepolia:

- Umbra repo includes `sepolia` in core network/deployment configs.
- ENS contracts repo includes a full `deployments/sepolia` set.

This is source-level confirmation. Live runtime validation was not possible in this sandboxed environment due outbound RPC DNS restrictions.

## Review Scope

Compared current implementation in `src/` and `test/` against project documentation in `README.md` and `docs/`.

## Findings (Ordered by Severity)

### 1) Tool contract mismatch (documented vs implemented)

Documentation defines these primary tools:

- `get-payment-preferences`
- `get-stealth-meta-address`
- `generate-stealth-address`
- `send-stealth-payment`
- `scan-received-payments`
- `create-payment-link`

Current server registers only:

- `get-payment-profile`
- `generate-stealth-address`
- `send-stealth-payment`
- `create-payment-link`

Evidence:

- `src/index.ts`
- `src/tools/get-payment-profile.ts`

Impact:

- Consumers integrating from docs will call non-existent tools.
- Current MCP API is not doc-compatible.

Recommended fix:

- either rename/alias implemented tools to documented names
- or update docs to current tool contract (not recommended given latest architecture direction)

### 2) Missing documented tools

Not implemented as MCP tools:

- `get-stealth-meta-address`
- `scan-received-payments`

Evidence:

- no corresponding files under `src/tools/`
- `src/index.ts` does not register them

Impact:

- privacy discovery and receiver-side scanning flow is incomplete vs architecture docs.

Recommended fix:

- implement both tools and register in `src/index.ts`

### 3) Execution mode divergence in `send-stealth-payment`

Docs specify dual mode:

- `execution_mode=execute`
- `execution_mode=build_unsigned_tx`

Implementation only executes directly and requires `SENDER_PRIVATE_KEY`.

Evidence:

- `src/tools/send-stealth-payment.ts`

Impact:

- documented unsigned-tx integration path is unavailable.

Recommended fix:

- add `execution_mode` input
- return unsigned payload in `build_unsigned_tx` mode

### 4) ENS key schema divergence

Docs now propose frozen ENS keys under `stealthpay.v1.*`.
Implementation reads legacy keys:

- `chain`
- `token`
- `stealth-meta-address`

Evidence:

- `src/lib/ens.ts`

Impact:

- profile resolution does not follow the planned schema contract.
- future migration risk when key freeze is applied.

Recommended fix:

- implement parser for `stealthpay.v1.*` keys
- maintain temporary backward compatibility for legacy keys if needed

### 5) MCP composition divergence (ENS MCP / EVM MCP not used)

Docs position StealthPay as orchestration over ENS MCP + EVM MCP.
Implementation calls chain RPC directly using `viem` for ENS and tx execution.

Evidence:

- `src/lib/ens.ts`
- `src/lib/payments.ts`

Impact:

- architecture in docs and code behavior are materially different.

Recommended fix:

- decide target architecture for hackathon MVP:
  - keep direct RPC and adjust docs, or
  - integrate ENS MCP/EVM MCP adapters and keep docs as-is

### 6) Umbra SDK divergence

Docs state Umbra Protocol SDK should be leveraged.
Implementation re-implements stealth generation/check using custom `@noble/secp256k1` logic.

Evidence:

- `src/lib/stealth.ts`
- `package.json` (no Umbra SDK dependency)

Impact:

- contradicts project direction to avoid reimplementing stealth primitives.

Recommended fix:

- replace or wrap current stealth module with Umbra SDK usage
- keep current implementation only as fallback/test harness if needed

### 7) Network support inconsistency around Hoodi

Docs currently flag Hoodi as not confirmed.
Implementation includes `hoodi` in `SUPPORTED_CHAINS`, but token config excludes Hoodi; payments on Hoodi fail for token routing.

Evidence:

- `src/config.ts`
- `src/lib/payments.ts`

Impact:

- runtime behavior may advertise support but fail in practice.

Recommended fix:

- remove Hoodi from supported chains until contracts/tokens are confirmed
- or add full Hoodi token + contract support and validate end-to-end

### 8) Test command polluted by `.local/` clones

`npm test` runs Vitest across `.local/ens-contracts` and `.local/umbra-protocol` tests, producing many irrelevant failures.

Evidence:

- `npm test` output (fails on `.local/*` test suites)
- no exclude patterns in `vitest.config.ts`

Impact:

- default CI/dev signal is noisy and misleading.

Recommended fix:

- add excludes for `.local/**`, `dist/**`, `node_modules/**` in `vitest.config.ts`

## Test Snapshot

- `npm run test:unit`: PASS (15/15)
- `npm run test:ens`: FAIL in this environment (RPC DNS/network restriction)
- `npm test`: FAIL (includes `.local` external repo tests)

## Priority Remediation Plan

1. Align MCP tool contract names and missing tools (`get-stealth-meta-address`, `scan-received-payments`).
2. Implement `send-stealth-payment` execution mode split.
3. Decide and lock architecture direction: MCP composition vs direct RPC.
4. Implement frozen ENS key parser (`stealthpay.v1.*`).
5. Integrate Umbra SDK or update docs to intentional custom implementation.
6. Fix test discovery to ignore `.local`.
