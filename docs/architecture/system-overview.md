# System Overview

## High-Level Components

- ENS Resolver Layer
- Payment Profile Parser/Validator
- Route Builder (token/chain preference matching)
- Privacy Adapter (stealth receiver generation/handling)
- Link/Intent Generator
- MCP Tool Interface

## Data Flow

1. Client/agent calls MCP tool with ENS and payment context.
2. Resolver fetches ENS-linked payment metadata.
3. Parser validates and normalizes profile.
4. Route builder computes ranked payment routes.
5. Privacy adapter injects stealth-compatible receiver info.
6. Server returns structured execution plan (and optional link payload).

## Design Constraints

- Route selection must be explainable and deterministic.
- Profile parsing failures must produce typed errors.
- Privacy mode should influence route scoring.

## Integration Points

- ENS read access
- stealth addressing primitive (Umbra-like / ERC-5564-based)
- optional relayer/sponsor stack for gasless flow
