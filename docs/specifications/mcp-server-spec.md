# MCP Server Specification

## Purpose

Define StealthPay MCP tools, payload shapes, and error contracts.

## External Dependencies

- Umbra Protocol SDK: stealth meta-address logic and stealth address derivation/scanning
- ENS MCP: ENS identity and text-record retrieval
- EVM MCP: transaction execution and status checks

## Tool Specifications (Draft)

### `get-payment-preferences`

Input:

- `name` (string, ENS)

Output:

- `name`
- `preferred_chains` (ordered list)
- `preferred_tokens` (ordered list)
- `privacy_mode`
- `raw_records` (optional debug payload)

### `get-stealth-meta-address`

Input:

- `name` (string, ENS)

Output:

- `name`
- `stealth_meta_address`
- `source` (ENS record / registry / fallback)

### `generate-stealth-address`

Input:

- `name` (string, ENS)
- `chain_id` (number)
- `token` (string)

Output:

- `name`
- `stealth_address`
- `ephemeral_pubkey` (if applicable)
- `announcer_contract`
- `registry_contract`

### `send-stealth-payment`

Input:

- `name` (string, ENS)
- `amount` (string)
- `token` (string)
- `chain_id` (number)
- `max_slippage_bps` (optional)
- `execution_mode` (optional: `execute|build_unsigned_tx`, default `execute`)

Output:

- `route_summary`
- `stealth_address`
- `chain_id`
- `execution_mode`
- `tx_hash` (present when `execution_mode=execute`)
- `status` (present when `execution_mode=execute`)
- `unsigned_tx` (present when `execution_mode=build_unsigned_tx`)

Notes:

- this tool composes `generate-stealth-address` + EVM MCP transaction building/execution
- in `build_unsigned_tx`, StealthPay MCP returns payload for external signing/broadcast

### `scan-received-payments`

Input:

- `keys` (object; viewing/spending or scan-compatible key material)
- `chain_ids` (array<number>)
- `from_block` (optional)

Output:

- `payments` (array)
- `next_cursor` (optional)

### `create-payment-link`

Input:

- `name` (string, ENS)
- `amount` (string)
- `token` (string)
- `chain_id` (number)
- `expires_at` (optional)
- `metadata` (optional object)

Output:

- `payment_link`
- `intent_payload`
- `expires_at`

## Error Model (Draft)

- `INVALID_INPUT`
- `ENS_RESOLUTION_FAILED`
- `PAYMENT_PREFERENCES_NOT_FOUND`
- `STEALTH_META_ADDRESS_NOT_FOUND`
- `UMBRA_SDK_ERROR`
- `EVM_EXECUTION_FAILED`
- `UNSIGNED_BUILD_UNSUPPORTED`
- `UNSUPPORTED_CHAIN`
- `INTERNAL_ERROR`

## Response Principles

- deterministic fields and types
- explicit upstream provenance (`ens_mcp`, `evm_mcp`, `umbra_sdk`)
- no hidden route-selection assumptions
