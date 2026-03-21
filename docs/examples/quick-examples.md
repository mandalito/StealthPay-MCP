# Quick Examples (Current)

## Example 1: Onboard a New Recipient

- register ENS name on Sepolia
- set stealth keys with `register-stealth-keys`
- copy returned spending/viewing keys into local `.env` (`RECIPIENT_*`)
- verify profile with `get-payment-profile`

## Example 2: Send a Private Payment

- resolve recipient with `get-payment-profile`
- generate one-time address with `generate-stealth-address`
- send with `send-stealth-payment`

## Example 3: Recipient Claims Funds

- discover incoming payments with `scan-announcements`
- derive control key with `derive-stealth-key`
- transfer out via `withdraw-from-stealth`
