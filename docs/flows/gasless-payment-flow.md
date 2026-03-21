# Gasless Payment Flow (Draft)

## Goal

Describe a sponsored transaction path when available through EVM MCP/integrator stack.

## Baseline Sequence

1. Agent resolves preferences and stealth destination.
2. Agent requests `send-stealth-payment(params)` with gasless preference.
3. StealthPay MCP checks whether EVM MCP supports sponsored execution on chain.
4. If available, EVM MCP submits sponsored tx.
5. StealthPay MCP returns tx hash/status to caller.

## Constraints

- gasless behavior depends on EVM MCP capability per chain
- tool response must declare whether route was sponsored or not

## Open Questions

- [TODO] Final sponsor policy and limits.
- [TODO] Whether gasless support ships in MVP or post-hackathon.
