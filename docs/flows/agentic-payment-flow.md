# Agentic Payment Flow

## Goal

Describe how an agent executes a contextual stealth payment with composed MCP services.

## Step-by-Step

1. User asks agent: "Send 50 USDC to alice.eth privately".
2. Agent calls `get-payment-preferences(name)`.
3. StealthPay MCP resolves ENS records via ENS MCP.
4. Agent calls `get-stealth-meta-address(name)`.
5. Agent calls `generate-stealth-address(name)` with chain/token context.
6. Agent calls `send-stealth-payment(params)`.
7. StealthPay MCP delegates transaction execution to EVM MCP.
8. Agent receives tx status and optional payment-link/receipt payload.

## Decision Inputs

- recipient preferred chains/tokens
- payer execution constraints
- privacy mode requirement
- network support (Ethereum, Base, OP, Arbitrum)

## Failure Handling

- ENS lookup failure: `ENS_RESOLUTION_FAILED`
- no preferences: `PAYMENT_PREFERENCES_NOT_FOUND`
- no stealth metadata: `STEALTH_META_ADDRESS_NOT_FOUND`
- tx failure: `EVM_EXECUTION_FAILED`
