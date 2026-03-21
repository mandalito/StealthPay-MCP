# Payment Profile Schema (Draft)

## Goal

Define a machine-readable payment profile discoverable from ENS-linked data.

## Logical Fields

- `version`
- `recipient_ens`
- `preferred_chains` (ordered)
- `preferred_assets` (ordered)
- `fallback_rules`
- `privacy_mode` (`public` | `stealth_preferred` | `stealth_required`)
- `stealth_config` (scheme, keys/public parameters)
- `gasless_preferences`
- `updated_at`

## JSON Example

```json
{
  "version": "0.1",
  "recipient_ens": "alice.eth",
  "preferred_chains": ["base", "ethereum"],
  "preferred_assets": ["USDC", "ETH"],
  "fallback_rules": {
    "allow_asset_conversion": true,
    "max_slippage_bps": 100
  },
  "privacy_mode": "stealth_preferred",
  "stealth_config": {
    "scheme": "erc-5564",
    "viewing_pubkey": "0x...",
    "spending_pubkey": "0x..."
  },
  "gasless_preferences": {
    "enabled": true,
    "sponsor": "auto"
  },
  "updated_at": "2026-03-21T00:00:00Z"
}
```

## ENS Mapping (Placeholder)

- [TODO] Define exact text records / contenthash strategy.
- [TODO] Define max payload size and fragmentation strategy.

## Validation Rules (Draft)

- `version` is required.
- ordered arrays must be non-empty when present.
- `privacy_mode=stealth_required` requires valid `stealth_config`.
- unknown fields should be ignored but logged for compatibility review.
