# ENS Text Record Keys (Freeze Proposal v1)

## Goal

Define a stable key set for recipient payment preferences discoverable through ENS text records.

## Naming Convention

All keys use the `stealthpay.v1.*` namespace.

## Proposed Keys

### Required

- `stealthpay.v1.profile_version`
value: `1`

- `stealthpay.v1.preferred_chain`
value: CAIP-2 chain id, example: `eip155:8453`

- `stealthpay.v1.coins`
value: ordered CSV of CAIP-19 assets, example:
`eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,eip155:8453/slip44:60`

- `stealthpay.v1.stealth_tx`
value: `required|preferred|disabled`

### Optional

- `stealthpay.v1.fallback_address`
value: JSON map by chain id:
`{"eip155:8453":"0x...","eip155:11155111":"0x..."}`

- `stealthpay.v1.note_required`
value: `true|false`

- `stealthpay.v1.note_encryption`
value: `none|ecies-secp256k1`

- `stealthpay.v1.note_encryption_pubkey`
value: hex-encoded secp256k1 public key for note encryption

- `stealthpay.v1.note_max_bytes`
value: integer string, example: `280`

## Validation Rules

- `profile_version`, `preferred_chain`, `coins`, and `stealth_tx` are mandatory.
- if `stealth_tx=required`, stealth metadata must be resolvable (ENS resolver and/or registry).
- if `note_required=true`, `note_encryption` must not be `none`.
- if `note_required=true`, `note_encryption_pubkey` is required.
- `fallback_address` entries must be checksum addresses for their target chain format.

## Recommended Defaults

- `stealthpay.v1.stealth_tx=preferred`
- `stealthpay.v1.note_required=false`
- `stealthpay.v1.note_encryption=none`

## Example Record Set

```text
stealthpay.v1.profile_version = 1
stealthpay.v1.preferred_chain = eip155:8453
stealthpay.v1.coins = eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,eip155:8453/slip44:60
stealthpay.v1.stealth_tx = required
stealthpay.v1.fallback_address = {"eip155:8453":"0x8ba1f109551bD432803012645Ac136ddd64DBA72"}
stealthpay.v1.note_required = true
stealthpay.v1.note_encryption = ecies-secp256k1
stealthpay.v1.note_encryption_pubkey = 0x04...
stealthpay.v1.note_max_bytes = 280
```
