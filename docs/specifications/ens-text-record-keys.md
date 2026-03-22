# ENS Text Record Keys — Frozen Specification

## Status: FROZEN as of v1 (2026-03-22)

The `stealthpay.v1.*` namespace is the canonical key prefix for StealthPay payment profiles stored in ENS text records.

**Decision:** We retain `stealthpay.v1.*` as the canonical prefix (not `io.stealthpay.payments.*`). The `stealthpay.v1.*` namespace is already deployed, written to ENS on-chain, and read by the dual-read parser. Renaming would require a migration for existing profiles with no functional benefit.

## Canonical Keys (stealthpay.v1.*)

| ENS Key | Type | Example | Description |
|---------|------|---------|-------------|
| `stealthpay.v1.profile_version` | string | `"1"` | Schema version marker |
| `stealthpay.v1.preferred_chains` | CSV | `"eip155:8453,eip155:10"` | CAIP-2 chain IDs, comma-separated |
| `stealthpay.v1.preferred_assets` | CSV | `"eip155:8453/erc20:0x833..."` | CAIP-19 asset IDs, comma-separated |
| `stealthpay.v1.stealth_policy` | enum | `"preferred"` | `required \| preferred \| optional \| disabled` |
| `stealthpay.v1.stealth_scheme_ids` | CSV | `"1"` | ERC-5564 scheme IDs |
| `stealthpay.v1.note_policy` | enum | `"optional"` | `required \| optional \| none` |
| `stealthpay.v1.note_max_bytes` | number | `"140"` | Max memo size in bytes |
| `stealthpay.v1.note_privacy` | enum | `"plaintext"` | `plaintext \| encrypted \| hash_only` |

## Legacy Keys (read-only fallback)

| ENS Key | Maps to |
|---------|---------|
| `chain` | `preferredChain` (friendly name) |
| `token` | `preferredToken` (symbol) |
| `description` | `description` |
| `stealth-meta-address` | `stealthMetaAddress` |
| `avatar` | `avatar` |

## Read Behavior (dual-read)

1. Read all `stealthpay.v1.*` keys
2. Fall back to legacy keys where v1 key is absent
3. Apply defaults from `PROFILE_DEFAULTS` for policy fields

## Write Behavior (dual-write during migration)

When `set-profile` writes a preference:
1. Write the canonical `stealthpay.v1.*` key (CAIP-normalized)
2. Also write the corresponding legacy key (friendly name/symbol) for backwards compatibility
3. Automatically set `stealthpay.v1.profile_version = "1"` if any v1 key is written

## Migration / Alias Policy

- Legacy keys will continue to be **read** indefinitely for backwards compatibility
- Legacy keys will continue to be **written** alongside v1 keys during the migration window
- The migration window ends when a future `stealthpay.v2.*` namespace is introduced
- No aliases for `io.stealthpay.payments.*` are planned — that prefix was evaluated and rejected

## Key Format Rules

- Chain IDs: CAIP-2 (`eip155:<chainId>`)
- Asset IDs: CAIP-19 (`eip155:<chainId>/slip44:60` for native, `eip155:<chainId>/erc20:<address>` for tokens)
- Multi-value fields: comma-separated, no spaces
- Enum fields: lowercase, exact match required
