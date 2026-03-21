# MCP Server Specification

## Purpose

Define StealthPay MCP tools, payload shapes, and error contracts.

## Proposed Tools

### `resolve_payment_profile`

Input:

- `ens_name` (string)
- `payment_context` (optional object: amount, token preference, urgency, privacy level)

Output:

- normalized recipient payment profile
- supported chains/tokens
- privacy capabilities (stealth support)

### `build_payment_route`

Input:

- `ens_name` (string)
- `amount` (string or number)
- `asset` (symbol/address)
- `constraints` (optional object)

Output:

- selected route
- route alternatives
- receiver endpoint data
- execution hints

### `create_payment_link`

Input:

- route payload
- optional expiry and metadata

Output:

- payment link
- signed/encoded payload metadata

## Error Model (Draft)

- `ENS_NOT_FOUND`
- `PROFILE_NOT_FOUND`
- `NO_COMPATIBLE_ROUTE`
- `STEALTH_UNAVAILABLE`
- `INVALID_INPUT`
- `INTERNAL_ERROR`

## Response Principles

- deterministic fields and types
- explicit fallback recommendations
- no hidden assumptions in route selection

## Open Questions

- [TODO] Final MCP transport details and tool naming conventions.
- [TODO] Authentication and rate-limit strategy.
- [TODO] Whether responses include optional simulation results.
