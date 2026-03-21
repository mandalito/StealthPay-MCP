# MCP Composition

## Intent

Clarify responsibilities across MCP servers and SDK dependencies.

## Responsibility Split

- User/AI asks for a payment action.
- StealthPay MCP coordinates payment logic.
- ENS MCP resolves ENS identity and text records.
- EVM MCP executes transactions and returns chain status.
- Umbra Protocol SDK handles stealth meta-address and stealth address operations.

## Tool Surface Exposed by StealthPay MCP

- `get-stealth-meta-address(name)`
- `generate-stealth-address(name)`
- `get-payment-preferences(name)`
- `create-payment-link(params)`
- `send-stealth-payment(params)`
- `scan-received-payments(keys)`

## Onchain Interfaces in Scope

- ERC-5564 announcer
- ERC-6538 registry
- ENS text records
- Networks: Ethereum, Base, OP, Arbitrum

## Boundary Rules

- StealthPay MCP does not replace ENS MCP.
- StealthPay MCP does not replace EVM MCP.
- StealthPay MCP should expose stable tool contracts even if upstream SDK/provider details change.
