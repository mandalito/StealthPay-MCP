# Payment Profile Schema (Current Implementation)

## Returned Profile Shape

`get-payment-profile` returns the full `PaymentProfile` interface:

| Field | Type | Description |
|-------|------|-------------|
| `ensName` | string | Normalized ENS name |
| `address` | string \| null | Resolved Ethereum address |
| `avatar` | string \| null | Avatar URI |
| `description` | string \| null | Profile description |
| `preferredChains` | string[] | CAIP-2 chain IDs (e.g. `["eip155:8453"]`) |
| `preferredAssets` | string[] | CAIP-19 asset IDs |
| `preferredChain` | string \| null | Legacy-compatible friendly chain name (e.g. `"base"`) |
| `preferredToken` | string \| null | Legacy-compatible token symbol (e.g. `"USDC"`) |
| `stealthMetaAddress` | string \| null | ERC-5564 stealth meta-address |
| `stealthPolicy` | enum | `required \| preferred \| optional \| disabled` (default: `preferred`) |
| `stealthSchemeIds` | number[] | Supported ERC-5564 scheme IDs (default: `[1]`) |
| `notePolicy` | enum | `required \| optional \| none` (default: `optional`) |
| `noteMaxBytes` | number | Max memo length in bytes (default: `140`) |
| `notePrivacy` | enum | `plaintext \| encrypted \| hash_only` (default: `plaintext`) |

## ENS Text Keys — Dual-Read Strategy

The parser reads `stealthpay.v1.*` namespaced keys first, then falls back to legacy keys:

### v1 Namespaced Keys (canonical)

- `stealthpay.v1.profile_version`
- `stealthpay.v1.preferred_chains` (CAIP-2 CSV)
- `stealthpay.v1.preferred_assets` (CAIP-19 CSV)
- `stealthpay.v1.stealth_policy`
- `stealthpay.v1.stealth_scheme_ids`
- `stealthpay.v1.note_policy`
- `stealthpay.v1.note_max_bytes`
- `stealthpay.v1.note_privacy`

### Legacy Keys (fallback)

- `chain` → `preferredChain`
- `token` → `preferredToken`
- `stealth-meta-address` → `stealthMetaAddress`
- `description` → `description`
- `avatar` → `avatar`

## Stealth Meta-Address Lookup Order

1. ENS text record `stealth-meta-address`
2. ERC-6538 registry lookup by resolved ENS address

## Example (Logical)

```json
{
  "ensName": "alice.eth",
  "address": "0x2222222222222222222222222222222222222222",
  "avatar": "ipfs://...",
  "description": "Private payments preferred",
  "preferredChains": ["eip155:8453"],
  "preferredAssets": ["eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  "preferredChain": "base",
  "preferredToken": "USDC",
  "stealthMetaAddress": "st:eth:0x...",
  "stealthPolicy": "preferred",
  "stealthSchemeIds": [1],
  "notePolicy": "optional",
  "noteMaxBytes": 140,
  "notePrivacy": "plaintext"
}
```

## Machine-Readable Schema

A JSON Schema (draft 2020-12) is published at `schemas/payment-profile.schema.json`.

## Full Specification

See `docs/specifications/ens-text-record-keys.md` for the frozen key namespace specification, migration policy, and format rules.
