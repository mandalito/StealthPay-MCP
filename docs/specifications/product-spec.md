# Product Specification

## Objective

Build an MCP server that converts ENS identity into contextual, privacy-aware payment execution hints usable by agents and apps.

## Scope

In scope:

- ENS-based payment profile discovery
- token and chain preference resolution
- private receiver addressing strategy (stealth)
- payment link generation and optional gasless-compatible flow descriptions

Out of scope (for hackathon baseline):

- full wallet UI implementation
- exhaustive chain coverage
- full production compliance and audits

## Personas

- Payer agent: chooses payment route from machine-readable recipient profile.
- Recipient user: publishes payment preferences linked to ENS.
- Integrator app: calls MCP tools and executes returned payment instructions.

## Functional Requirements

- Resolve ENS name to payment profile metadata.
- Return deterministic preference ranking for token/chain options.
- Provide a privacy-ready receiver endpoint (stealth-compatible target).
- Return actionable response format for automated payment orchestration.
- Support optional payment-link payload generation.

## Non-Functional Requirements

- predictable response schema
- low-latency lookup path where possible
- graceful failure with typed error messages
- minimal leakage of user-identifying payment patterns

## Acceptance Criteria (Draft)

- Given a valid ENS with profile data, server returns at least one payable route.
- Given incomplete profile data, server returns fallback route or typed error.
- Returned route includes privacy mode metadata when stealth is available.

## Open Questions

- [TODO] Canonical ENS record keys for profile fields.
- [TODO] Preferred fallback strategy ordering across chains.
- [TODO] Minimum viability of gasless execution in hackathon timeframe.
