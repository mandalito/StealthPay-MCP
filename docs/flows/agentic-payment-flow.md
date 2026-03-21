# Agentic Payment Flow (Current)

## Onboarding Flow

1. Call `register-ens-name` (optional if user already owns ENS name).
2. Call `register-stealth-keys` to write stealth metadata.

## Sender Flow

1. Call `get-payment-profile(name)`.
2. Call `generate-stealth-address(name)`.
3. Call `send-stealth-payment(to, amount, token, chain)`.
4. Optionally call `create-payment-link(...)` for sharing.

## Recipient Flow

1. Call `scan-announcements(viewingPrivateKey, spendingPublicKey, ...)`.
2. For each match, call `derive-stealth-key(...)`.
3. Call `withdraw-from-stealth(...)`.

## Hackathon Testnet

Use Sepolia for end-to-end hackathon tests.
