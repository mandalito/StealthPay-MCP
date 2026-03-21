# Future Development: Gasless Payment Flow

## Scope Status

Gasless payments are explicitly out of scope for the hackathon MVP.

This document captures a future direction only.

## Future Sequence (Non-MVP)

1. Agent resolves preferences and stealth destination.
2. Agent requests `send-stealth-payment(params)` with sponsored intent metadata.
3. StealthPay MCP checks whether the execution backend supports sponsorship on the selected chain.
4. If available, unsigned payload is signed and relayed through sponsor infrastructure.
5. StealthPay MCP returns tx hash/status and sponsorship metadata.

## Requirements for Future Rollout

- sponsor policy definition (quotas, anti-abuse rules)
- standardized sponsorship result schema
- chain-by-chain compatibility matrix
- failure fallback to regular non-sponsored tx path
