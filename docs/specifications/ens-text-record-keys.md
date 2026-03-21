# ENS Text Record Keys

## Status

This file contains a proposed future key freeze. It is **not** fully implemented by the current parser.

## Currently Implemented Keys

- `avatar`
- `chain`
- `token`
- `stealth-meta-address`
- `description`

## Proposed Future Namespace (Draft)

- `stealthpay.v1.profile_version`
- `stealthpay.v1.preferred_chain`
- `stealthpay.v1.coins`
- `stealthpay.v1.stealth_tx`
- `stealthpay.v1.fallback_address`
- `stealthpay.v1.note_required`
- `stealthpay.v1.note_encryption`
- `stealthpay.v1.note_encryption_pubkey`
- `stealthpay.v1.note_max_bytes`

## Migration Recommendation

When freezing keys, add dual-read behavior first:

1. read `stealthpay.v1.*` keys if present
2. fallback to legacy keys
3. remove legacy path after migration window
