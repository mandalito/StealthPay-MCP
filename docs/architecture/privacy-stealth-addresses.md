# Privacy and Stealth Addresses

## Motivation

Receiving repeated payments on a single public address creates linkability across transactions.

## Approach

StealthPay MCP supports stealth-compatible reception to reduce address reuse and on-chain correlation.

## Threats Addressed

- transaction clustering by static recipient address
- passive observation of repeated payer->recipient graph patterns

## Threats Not Fully Addressed

- full metadata privacy across all middleware layers
- network-level deanonymization
- centralized relayer/operator leakage

## Requirements

- unique receiver target derivation per payment intent (where supported)
- compatibility with recipient recovery flow
- explicit fallback when stealth path is unavailable

## Open Questions

- [TODO] Exact recovery and monitoring model for recipient wallets.
- [TODO] Preferred stealth primitive for hackathon implementation scope.
