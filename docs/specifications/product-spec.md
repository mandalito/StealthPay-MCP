# Product Specification (Current Implementation)

## Objective

Provide an MCP server that enables private ENS-based payments using stealth addresses, with programmable payment profiles, encrypted note support, and agent spend policy controls.

## Scope

In scope:

- ENS onboarding tools (`register-ens-name`, `register-stealth-keys`)
- profile management (`set-profile`, `get-payment-profile`)
- sender tools (`generate-stealth-address`, `send-stealth-payment`, `create-payment-link`)
- recipient tools (`scan-announcements`, `claim-stealth-payment`)
- identity tools (`get-my-profile`, `generate-wallet`, `get-balances`)
- CAIP-normalized payment profiles (`stealthpay.v1.*` ENS namespace)
- stealth/note policy enforcement in send flows
- encrypted notes (ChaCha20-Poly1305 with ECDH key derivation)
- agent spend policy engine (per-tx caps, daily limits, allowlists, signed governance)
- Sepolia-first hackathon execution for registration and end-to-end testing

Out of scope (hackathon MVP):

- gasless/sponsored transactions
- ERC-4337 paymaster integration
- multi-provider failover and production reliability hardening
- persistent spend ledger (currently in-memory)

## Personas

- sender agent: pays an ENS recipient privately, subject to spend policy controls
- recipient user: discovers and withdraws stealth payments
- onboarding user: registers ENS name, stealth metadata, and payment preferences
- operator/admin: configures spend policies and policy-admin keys

## Current Constraints

- `send-stealth-payment` supports stablecoin transfers on chains configured in `STABLECOINS` (ethereum, base, optimism, arbitrum, polygon, gnosis, sepolia).
- Sepolia stablecoin routing is wired for `USDC`, `DAI`, and `USDT`.
- ENS profile parsing uses dual-read: `stealthpay.v1.*` namespaced keys first, legacy keys as fallback.
- Spend policy is in-memory and resets on server restart.

## Acceptance Criteria (Current)

- MCP server boots and registers 13 tools.
- Unit tests for stealth math, payment links, policy engine, note encryption, and profile migration pass.
- Recipient-side flow (`scan-announcements` + `claim-stealth-payment`) is documented and callable.
- Agent spend policy is enforced on every transaction path (`send-stealth-payment`, `claim-stealth-payment`).
- Payment profile schema is published as machine-readable JSON Schema.
