# System Overview

## High-Level Components

- MCP Tool Interface (StealthPay MCP)
- Preference Resolver (ENS MCP client)
- Umbra Adapter (Umbra Protocol SDK integration)
- Route Builder and Payment Orchestrator
- Transaction Executor (EVM MCP client)
- Link/Intent Generator

## Runtime Flow

1. Agent calls StealthPay MCP tool.
2. StealthPay MCP queries ENS MCP for identity and payment preference records.
3. StealthPay MCP calls Umbra SDK to resolve/generate stealth addressing data.
4. Route builder picks token/chain path from preferences and constraints.
5. StealthPay MCP optionally calls EVM MCP for transaction execution.
6. Tool returns typed result (address, tx status, link payload, or scan results).

## Integration Points

- ENS MCP APIs
- EVM MCP APIs
- Umbra Protocol SDK
- ERC-5564 announcer contracts
- ERC-6538 registry contracts
- ENS records

## Design Constraints

- deterministic outputs per tool contract
- explicit failure origin (ENS MCP vs EVM MCP vs Umbra SDK)
- no custom stealth cryptography code in MVP
