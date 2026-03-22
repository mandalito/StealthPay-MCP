# Runtime Composition (Current)

## Current Design

StealthPay MCP currently runs as a self-contained server using direct RPC access (`viem`) and local cryptography modules.

## Internal Components

- ENS resolution + ENS registration helpers
- payment profile schema (types, validation, ENS key mappings)
- stealth address math/derivation
- payment sender + ERC-5564 announcer calls + note encryption
- announcement scanner
- withdrawal helper
- agent spend policy engine (caps, limits, allowlists, signed governance, audit logging)

## Tool Groups (13 tools)

- identity: get-my-profile, generate-wallet, get-balances
- onboarding & profile: register ENS name, register stealth keys, set profile, set primary name
- sender: resolve profile, generate address, send payment, create link
- recipient: scan, claim

## Note

Previous docs that described composition through ENS MCP and EVM MCP are now superseded by this current implementation baseline.
