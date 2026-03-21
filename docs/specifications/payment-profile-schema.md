# Payment Profile Schema (Draft)

## Goal

Define a machine-readable payment profile derived from ENS data and consumed by StealthPay MCP.

## Logical Fields

- `version`
- `recipient_ens`
- `preferred_chains` (ordered)
- `preferred_tokens` (ordered)
- `privacy_mode` (`public` | `stealth_preferred` | `stealth_required`)
- `stealth_meta_address`
- `updated_at`

## JSON Example

```json
{
  "version": "0.2",
  "recipient_ens": "alice.eth",
  "preferred_chains": ["base", "ethereum", "optimism"],
  "preferred_tokens": ["USDC", "ETH"],
  "privacy_mode": "stealth_preferred",
  "stealth_meta_address": "st:eth:0x...",
  "updated_at": "2026-03-21T00:00:00Z"
}
```

## ENS Mapping (Proposed for Hackathon)

- canonical key set: [ENS Text Record Keys](ens-text-record-keys.md)
- stealth meta-address source: ENS resolver data and/or ERC-6538 registry

## Validation Rules (Draft)

- `version` and `recipient_ens` are required
- `stealth_required` must include resolvable stealth meta-address
- chain identifiers must be in the supported network set
- unknown fields are ignored but logged

## Supported Network Set (Current Draft)

- Ethereum
- Base
- OP (Optimism)
- Arbitrum

## Future Extensions (Non-MVP)

- `gasless_preference` may be added in a post-hackathon schema version.
