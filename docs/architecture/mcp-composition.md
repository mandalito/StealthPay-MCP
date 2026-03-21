# Runtime Composition (Current)

## Current Design

StealthPay MCP currently runs as a self-contained server using direct RPC access (`viem`) and local cryptography modules.

## Internal Components

- ENS resolution + ENS registration helpers
- stealth address math/derivation
- payment sender + ERC-5564 announcer calls
- announcement scanner
- withdrawal helper

## Tool Groups

- onboarding: register ENS name and stealth keys
- sender: resolve profile, generate address, send, create link
- recipient: scan, derive stealth key, withdraw

## Note

Previous docs that described composition through ENS MCP and EVM MCP are now superseded by this current implementation baseline.
