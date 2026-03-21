# Privacy and Stealth Addresses

## Current Implementation

StealthPay uses ERC-5564-style stealth addressing logic implemented in `src/lib/stealth.ts`.

## Privacy Properties

- each payment can target a fresh stealth address
- address reuse is reduced
- recipient can discover payments using viewing key + announcement data

## Recipient Recovery Model

- scan announcements with viewing private key + spending public key
- derive stealth private key from spending/viewing private keys + ephemeral public key
- withdraw from stealth address

## Known Limitations

- stealth addresses need ETH for gas to withdraw
- metadata decoding assumes project-specific layout
- cross-sender metadata interoperability is limited
