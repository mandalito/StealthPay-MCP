# Agentic Payment Flow

## Goal

Describe how an agent performs a contextual payment via StealthPay MCP.

## Step-by-Step

1. Agent receives task: pay recipient `name.eth` with amount/context.
2. Agent calls `resolve_payment_profile`.
3. MCP server resolves ENS data and returns normalized preferences.
4. Agent calls `build_payment_route` with amount + constraints.
5. MCP server returns ranked route and privacy-aware receiver endpoint.
6. Agent executes selected route via wallet/integration layer.
7. Agent records outcome and optional receipt metadata.

## Decision Inputs

- recipient chain/token preferences
- payer constraints (available balance, allowed chains)
- privacy mode requirement
- optional gasless preference

## Failure Handling

- no profile: fail with `PROFILE_NOT_FOUND` or fallback policy
- no route: `NO_COMPATIBLE_ROUTE`
- stealth unavailable where required: `STEALTH_UNAVAILABLE`
