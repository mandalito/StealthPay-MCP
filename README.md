# StealthPay MCP

StealthPay MCP is a Model Context Protocol (MCP) server that turns an ENS name into a machine-readable, smart payment endpoint.

It lets agents and apps build contextual crypto payments based on recipient preferences (chain, token, UX options), while improving receiver privacy through stealth addresses.

## Problem Statement

Agentic payments in crypto are still weakly contextual:

- An agent can know who to pay, but not easily how that recipient prefers to be paid.
- ENS identity is readable, but does not by itself expose a machine-usable payment profile.
- Reusing a single public address for many payments increases on-chain correlation and weakens privacy.

StealthPay MCP addresses both dimensions:

- Smart, preference-aware payment routing from ENS-linked payment metadata.
- More private fund reception with stealth addresses (Umbra style / ERC-5564 direction).

## Core Idea

Given an ENS name, StealthPay MCP resolves a programmable payment profile and returns a payment plan adapted to context:

- preferred token and chain
- fallback options
- privacy-first reception target
- optional payment link or gasless flow

## Documentation

- [Documentation Hub](docs/README.md)
- [Product Specification](docs/specifications/product-spec.md)
- [MCP Server Specification](docs/specifications/mcp-server-spec.md)
- [Payment Profile Schema](docs/specifications/payment-profile-schema.md)
- [System Overview](docs/architecture/system-overview.md)
- [Agentic Payment Flow](docs/flows/agentic-payment-flow.md)
- [Examples](docs/examples/quick-examples.md)
- [Git Sync Workflow](docs/collaboration/git-sync-workflow.md)

## Hackathon Team Split

- MCP implementation
- Documentation (specs, README, examples)
- Tests

## Keeping In Sync

During hackathon development, pull regularly to reconcile teammate contributions:

```bash
git checkout main
git pull origin main
```

If you are on a feature branch with local changes:

```bash
git fetch origin
git rebase origin/main
```

Detailed workflow: [Git Sync Workflow](docs/collaboration/git-sync-workflow.md).
