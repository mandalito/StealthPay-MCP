# Payment Profile Standards Alignment Report

Date: 2026-03-22  
Repository: `StealthPay-MCP`  
Scope: payment profile expression for preferred currency/coin/chain, stealth vs transparent preference, and payment notes.

## Executive Summary

There is currently **no single canonical Ethereum standard** that bundles all payment profile preferences into one interoperable schema.

The practical standards-aligned path is to compose:

- identity/addressing standards (CAIP-2/10/19)
- stealth/payment primitives (ERC-5564, ERC-6538)
- request/link standards (ERC-681)
- profile storage conventions (ENS text records via ERC-634, with service-key namespacing)

Current StealthPay implementation is functional, but it uses mostly free-form text keys/values (`chain`, `token`, `description`) and a custom payment link format. This limits interoperability.

## Current Implementation Status (StealthPay)

Based on current code and docs:

- Profile read fields:
  - ENS `avatar`, `chain`, `token`, `stealth-meta-address`, `description`
- Profile write fields (`set-profile`):
  - `chain`, `token`, `description`
- Stealth support:
  - ERC-5564 flow implemented
  - ERC-6538 read fallback present
- Payment links:
  - custom `https://.../pay?to=&amount=&token=&chain=&memo=` format (`createPaymentLink`)

Not currently present as first-class normalized fields:

- explicit preferred fiat currency vs on-chain asset distinction
- standardized chain/asset/account identifiers (CAIP)
- explicit stealth policy enum (required/preferred/optional/disabled)
- standardized note/remittance policy model

## Standards Landscape (Relevant to Requested Fields)

| Requirement | Closest standard(s) | Status (as published) | Fit for profile schema |
|---|---|---|---|
| Preferred chain | CAIP-2 | Final | Strong; should be canonical chain identifier format |
| Preferred account/address per chain | CAIP-10 | Final | Strong; good for fallback transparent addresses |
| Preferred token/coin/asset | CAIP-19 | Review | Good direction; use with fallback if ecosystem/tooling gaps |
| Stealth addressing | ERC-5564, ERC-6538 | Standards Track ERC | Strong for stealth capability and lookup |
| Payment request link | ERC-681 | Standards Track ERC | Strong for wallet-interoperable request links |
| Chain-specific payment URI (cross-chain-oriented) | ERC-7856 | Draft | Experimental only; do not make default yet |
| On-chain payment note/reference in ERC-20 transfer | ERC-7699 | Draft | Useful but not reliable as baseline yet |
| ENS text KV storage | ERC-634 | Stagnant | Still widely used in practice; use namespaced keys to reduce collisions |

## Gap Analysis

1. Free-form `chain` and `token` values create ambiguity.
- Today these are user strings (`"base"`, `"USDC"`, etc.), not canonical IDs.
- Interop clients cannot reliably map all aliases.

2. No standardized representation for "preferred transparent address" per chain.
- Only one resolved ENS address is returned.
- Multi-chain payout preferences are underspecified.

3. No explicit stealth policy.
- Presence of `stealthMetaAddress` implies capability, but not policy.
- Sender cannot know if recipient requires stealth or only prefers it.

4. Note/memo handling is custom.
- `memo` exists in custom payment links but has no portability contract.
- On-chain reference behavior is token- and app-specific today.

5. Payment request URLs are not ERC-681.
- Custom URL works for your app but not generalized wallet ecosystems.

## ENS Data Model Clarification

ENS text records are a **flat** key-value map (`text(node, key) -> string`), not a nested JSON document model.

Practical implication for thematic grouping:

- You cannot create a true nested category like `paymentsPreferences.{...}` at the resolver level.
- You can group logically by key prefix/namespace, for example:
  - `io.stealthpay.payments.preferred_chains`
  - `io.stealthpay.payments.preferred_assets`
  - `io.stealthpay.payments.stealth_policy`
  - `io.stealthpay.payments.note_policy`
- If desired, you may store a JSON blob in one key (for example `io.stealthpay.payments`), but that is an app convention and reduces per-field discoverability/interoperability versus explicit keys.

## Recommendations

## 1) Adopt a Versioned, Namespaced Profile Keyset (High)

Move to service-key namespacing in ENS text records (dual-read during migration).  
This is how to represent thematic groups in ENS: by namespaced flat keys, not nested objects.

- `stealthpay.v1.profile_version = "1"`
- `stealthpay.v1.preferred_chains = "eip155:8453,eip155:1"` (CAIP-2 list)
- `stealthpay.v1.preferred_assets = "eip155:8453/erc20:0x...,eip155:1/slip44:60"` (CAIP-19 list)
- `stealthpay.v1.transparent_accounts = "eip155:8453:0x...,eip155:1:0x..."` (CAIP-10 list)
- `stealthpay.v1.stealth_policy = "preferred"` (`required|preferred|optional|disabled`)
- `stealthpay.v1.stealth_scheme_ids = "1"`
- `stealthpay.v1.note_policy = "optional"` (`required|optional|none`)
- `stealthpay.v1.note_format = "utf8"`
- `stealthpay.v1.note_max_bytes = "140"`
- `stealthpay.v1.note_privacy = "plaintext"` (`plaintext|encrypted|hash_only`)

Keep legacy keys (`chain`, `token`, `description`, `stealth-meta-address`) as compatibility mirrors during a migration window.

## 2) Normalize Internal Types Around CAIP IDs (High)

At API/tool boundaries and persistence:

- chains: CAIP-2 (not alias strings)
- accounts: CAIP-10
- assets: CAIP-19 (with local alias resolution for UX)

This gives deterministic parsing and cross-ecosystem compatibility.

## 3) Make Privacy Preference Explicit (High)

Define a strict policy field and enforce behavior:

- `required`: block transparent send paths
- `preferred`: default to stealth, allow transparent override
- `optional`: sender chooses
- `disabled`: do not generate stealth destination

Capability (`stealthMetaAddress` exists) and policy (`stealth_policy`) should be distinct.

## 4) Standardize Payment Requests on ERC-681 (Medium)

Add ERC-681 output mode for `create-payment-link` and make it default for wallet interop:

- native token request: `ethereum:0x...@<chainId>?value=<amount>`
- ERC-20 request: `ethereum:<tokenContract>@<chainId>/transfer?address=<to>&uint256=<amountAtomic>`

Keep custom HTTPS links as optional app-deep-link wrappers.

## 5) Treat Notes as Policy + Optional Transport, Not Guaranteed On-Chain Field (Medium)

- Profile should communicate note expectation (`note_policy`, `note_max_bytes`, `note_privacy`).
- For transport:
  - wallet link level: optional `memo`/off-chain context
  - token transfer level: support ERC-7699 only where token/tooling supports it (feature-flagged)
- Avoid assuming universal on-chain memo support across assets.

## 6) Publish a Machine-Readable JSON Schema for `stealthpay.v1` (Medium)

Create a schema file and use it for:

- profile input validation in `set-profile`
- normalized output in `get-payment-profile`
- future typed MCP `structuredContent`

## Suggested Target Profile Shape (Logical)

```json
{
  "version": "1",
  "preferredChains": ["eip155:8453", "eip155:1"],
  "preferredAssets": [
    "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "eip155:1/slip44:60"
  ],
  "transparentAccounts": [
    "eip155:8453:0xAb16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb",
    "eip155:1:0xAb16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb"
  ],
  "stealth": {
    "policy": "preferred",
    "metaAddress": "st:eth:0x...",
    "schemeIds": [1]
  },
  "note": {
    "policy": "optional",
    "format": "utf8",
    "maxBytes": 140,
    "privacy": "plaintext"
  },
  "description": "Private payments preferred"
}
```

## Recommended Rollout Plan

1. Add parser + validator for `stealthpay.v1.*` keys and dual-read legacy keys.
2. Update `set-profile` to dual-write new namespaced keys and legacy mirrors.
3. Update `get-payment-profile` to emit normalized canonical IDs plus backward-compatible fields.
4. Add ERC-681 output option to `create-payment-link`; keep existing URL as optional.
5. Add explicit stealth policy checks into send flows (`send-stealth-payment` and any transparent path).
6. Optionally add ERC-7699 integration behind capability detection (do not make mandatory).

## Conclusion

For your exact goal (preferred currency/coin/chain, stealth vs transparent, note expectations), the best standards-aligned strategy is:

- **CAIP for identifiers**
- **ERC-5564/6538 for stealth capability**
- **ERC-681 for wallet-friendly payment requests**
- **versioned ENS namespaced keys for profile publication**

There is no single existing standard covering the full profile envelope, so interoperability depends on adopting these components consistently and documenting your `stealthpay.v1` schema clearly.

## References

- [ERC-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [ERC-6538: Stealth Meta-Address Registry](https://eips.ethereum.org/EIPS/eip-6538)
- [ERC-681: URL Format for Transaction Requests](https://eips.ethereum.org/EIPS/eip-681)
- [ERC-634: Storage of text records in ENS](https://eips.ethereum.org/EIPS/eip-634)
- [ERC-7699: ERC-20 Transfer Reference Extension (Draft)](https://eips.ethereum.org/EIPS/eip-7699)
- [ERC-7856: Chain-Specific Payment Requests (Draft)](https://eips.ethereum.org/EIPS/eip-7856)
- [CAIP-2: Blockchain ID Specification](https://standards.chainagnostic.org/CAIPs/caip-2)
- [CAIP-10: Account ID Specification](https://standards.chainagnostic.org/CAIPs/caip-10)
- [CAIP-19: Asset Type and Asset ID Specification](https://standards.chainagnostic.org/CAIPs/caip-19)
