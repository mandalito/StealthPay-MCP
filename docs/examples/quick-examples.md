# Quick Examples (Current)

## Example 1: Onboard a New Recipient

- register ENS name on Sepolia
- set stealth keys with `register-stealth-keys`
- set payment preferences with `set-profile` (chain, token, stealth policy, note policy)
- confirm recipient keys were written to local `.env` (`RECIPIENT_*`)
- verify profile with `get-payment-profile`

## Example 2: Send a Private Payment

- resolve recipient with `get-payment-profile`
- generate one-time address with `generate-stealth-address`
- send with `send-stealth-payment` (optionally include a memo)
- memo is encrypted if recipient `notePrivacy` is `encrypted`
- transaction is checked against agent spend policy before execution

## Example 3: Recipient Claims Funds

- discover incoming payments with `scan-announcements`
- claim via `claim-stealth-payment` (derive + withdraw server-side)
- destination is checked against agent spend policy allowlists
