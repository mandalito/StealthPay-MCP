# StealthPay MCP

StealthPay MCP is an MCP server that turns an ENS name into a machine-usable, privacy-aware payment endpoint.

It does not reinvent stealth payment primitives. Instead, it orchestrates:

- Umbra Protocol SDK for stealth-address logic
- ENS MCP for identity and ENS record resolution
- EVM MCP for transaction execution

## Problem Statement

Agentic crypto payments are not contextual enough today:

- an agent can know who to pay, but not reliably how the recipient wants to be paid
- ENS identity is readable, but not sufficient as a complete machine-ready payment profile
- reusing one public address increases onchain correlation and weakens privacy

StealthPay MCP solves both sides:

- payment routing based on recipient preferences (chain, token, UX constraints)
- privacy-aware reception using stealth addresses via Umbra-compatible flows

## Composed Architecture

StealthPay MCP sits between AI agents and specialized infrastructure MCPs:

- ENS MCP: read identity + ENS text records
- StealthPay MCP: resolve preferences + generate stealth payment route
- EVM MCP: execute transaction and return tx status

Underlying onchain pieces in scope:

- ERC-5564 announcer
- ERC-6538 registry
- ENS text records
- target networks: Ethereum, Base, OP, Arbitrum

## StealthPay MCP Tools (Current Draft)

- `get-stealth-meta-address(name)`
- `generate-stealth-address(name)`
- `get-payment-preferences(name)`
- `create-payment-link(params)`
- `send-stealth-payment(params)`
- `scan-received-payments(keys)`

## Documentation

- [Documentation Hub](docs/README.md)
- [Product Specification](docs/specifications/product-spec.md)
- [MCP Server Specification](docs/specifications/mcp-server-spec.md)
- [Payment Profile Schema](docs/specifications/payment-profile-schema.md)
- [ENS Text Record Keys](docs/specifications/ens-text-record-keys.md)
- [Network Support Status](docs/specifications/network-support.md)
- [MCP Composition](docs/architecture/mcp-composition.md)
- [System Overview](docs/architecture/system-overview.md)
- [Agentic Payment Flow](docs/flows/agentic-payment-flow.md)
- [Examples](docs/examples/quick-examples.md)
- [Git Sync Workflow](docs/collaboration/git-sync-workflow.md)

## Hackathon Team Split

- MCP implementation
- Documentation (specs, README, examples)
- Tests

## Scope Note

Gasless payments are a future development item and are not part of the hackathon MVP scope.

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
