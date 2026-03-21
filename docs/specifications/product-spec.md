# Product Specification (Current Implementation)

## Objective

Provide an MCP server that enables private ENS-based payments using stealth addresses, including sender flow, recipient discovery, and ENS onboarding utilities.

## Scope

In scope:

- ENS onboarding tools (`register-ens-name`, `register-stealth-keys`)
- sender tools (`get-payment-profile`, `generate-stealth-address`, `send-stealth-payment`, `create-payment-link`)
- recipient tools (`scan-announcements`, `derive-stealth-key`, `withdraw-from-stealth`)
- Sepolia-first hackathon execution for registration and end-to-end testing

Out of scope (hackathon MVP):

- gasless/sponsored transactions
- ERC-4337 paymaster integration
- multi-provider failover and production reliability hardening

## Personas

- sender agent: pays an ENS recipient privately
- recipient user: discovers and withdraws stealth payments
- onboarding user: registers ENS name and stealth metadata

## Current Constraints

- `send-stealth-payment` supports stablecoin transfers only on chains configured in `STABLECOINS`.
- Sepolia is used as hackathon testnet, but stablecoin send config for Sepolia is not yet wired in current code.
- ENS profile parsing currently uses legacy ENS text keys (`chain`, `token`, `stealth-meta-address`).

## Acceptance Criteria (Current)

- MCP server boots and registers 9 tools.
- Unit tests for stealth math and payment links pass.
- Recipient-side flow (`scan-announcements` + `derive-stealth-key` + `withdraw-from-stealth`) is documented and callable.
