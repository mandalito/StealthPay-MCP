# Payment Profile Schema (Current Implementation)

## Returned Profile Shape

`get-payment-profile` currently returns:

- `ensName`
- `address`
- `avatar`
- `preferredChain`
- `preferredToken`
- `stealthMetaAddress`
- `description`

## Current ENS Text Keys Read by Code

- `avatar`
- `chain`
- `token`
- `stealth-meta-address`
- `description`

## Stealth Meta-Address Lookup Order

1. ENS text record `stealth-meta-address`
2. ERC-6538 registry lookup by resolved ENS address

## Example (Logical)

```json
{
  "ensName": "alice.eth",
  "address": "0x...",
  "avatar": "ipfs://...",
  "preferredChain": "sepolia",
  "preferredToken": "USDC",
  "stealthMetaAddress": "st:eth:0x...",
  "description": "Private payments preferred"
}
```

## Forward Compatibility

A future key freeze under `stealthpay.v1.*` is documented in `ens-text-record-keys.md`, but is not yet the active parser behavior.
