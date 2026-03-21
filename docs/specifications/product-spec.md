# Product Specification

## Objective

Build StealthPay MCP as a composition/orchestration layer that converts ENS identity into contextual, privacy-aware payment actions for AI agents and apps.

## Product Positioning

StealthPay MCP is not a replacement for ENS MCP or EVM MCP.

- ENS MCP provides identity and record retrieval.
- EVM MCP provides transaction execution.
- StealthPay MCP provides payment intent interpretation, preference resolution, and Umbra-SDK-backed privacy routing.

## Scope

In scope:

- ENS-based payment preference resolution
- stealth address generation and scanning via Umbra Protocol SDK
- payment link creation for app/agent handoff
- transaction orchestration via EVM MCP

Out of scope (hackathon baseline):

- custom stealth cryptography implementation
- gasless/sponsored transactions
- full wallet UI product
- production-grade multi-chain operations at scale

## Personas

- payer agent: receives natural language instruction and calls MCP tools
- recipient user: publishes payment preferences and stealth metadata
- integrator app: executes and monitors transaction lifecycle

## Functional Requirements

- support `get-payment-preferences(name)`
- support `get-stealth-meta-address(name)`
- support `generate-stealth-address(name)`
- support `send-stealth-payment(params)`
- support `scan-received-payments(keys)`
- support `create-payment-link(params)`
- support `send-stealth-payment` in both `execute` and `build_unsigned_tx` modes

## Non-Functional Requirements

- deterministic response schema
- explicit error taxonomy for upstream MCP/SDK failures
- low-friction integration for agentic workflows
- privacy-aware defaults where data is available

## Acceptance Criteria (Draft)

- given a resolvable ENS name, payment preferences can be returned in typed JSON
- given valid stealth metadata, a stealth receiver address can be generated
- given payment params, transaction can be delegated to EVM MCP and return execution status
- given scan keys, received stealth payment events can be discovered

## Open Questions

- [TODO] Final canonical ENS text-record keys for payment preferences.
- [TODO] Minimum chain set at launch (Ethereum/Base/OP/Arbitrum or subset).
