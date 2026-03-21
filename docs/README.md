# Documentation Hub

This folder contains the documentation baseline for the hackathon.

## Documentation Tree

```text
docs/
  README.md
  changelog.md
  specifications/
    product-spec.md
    mcp-server-spec.md
    ens-text-record-keys.md
    payment-profile-schema.md
  architecture/
    mcp-composition.md
    system-overview.md
    privacy-stealth-addresses.md
  flows/
    agentic-payment-flow.md
    gasless-payment-flow.md
  examples/
    quick-examples.md
    mcp-tool-usage.md
  collaboration/
    git-sync-workflow.md
```

## Suggested Authoring Order

1. `specifications/product-spec.md`
2. `specifications/mcp-server-spec.md`
3. `architecture/mcp-composition.md`
4. `flows/agentic-payment-flow.md`
5. `examples/mcp-tool-usage.md`

## Documentation Rules

- Document StealthPay as an orchestration layer over Umbra SDK + ENS MCP + EVM MCP.
- Keep behavior-first language: input, output, constraints, errors.
- Prefer short, testable acceptance criteria.
- Record assumptions and open questions explicitly.
- Update `docs/changelog.md` for meaningful documentation updates.
