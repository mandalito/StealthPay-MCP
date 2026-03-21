# Documentation Hub

This folder tracks the current implementation baseline for the hackathon.

## Documentation Tree

```text
docs/
  README.md
  changelog.md
  implementation-gap-report.md
  specifications/
    product-spec.md
    mcp-server-spec.md
    payment-profile-schema.md
    ens-text-record-keys.md
    network-support.md
  architecture/
    mcp-composition.md
    system-overview.md
    privacy-stealth-addresses.md
    dependency-evaluation.md
  flows/
    agentic-payment-flow.md
    gasless-payment-flow.md
  examples/
    quick-examples.md
    mcp-tool-usage.md
  collaboration/
    git-sync-workflow.md
  testing/
    mcp-endpoint-coverage-report.md
    test-suite-structure.md
  security/
    private-key-leakage-risk-assessment.md
```

## Current Baseline

- Hackathon testnet decision: Sepolia
- Implementation-first docs: tool names and payloads match current code in `src/tools/*`
- Recipient flow is included (scan -> derive key -> withdraw)
- Local helper scripts and external SDK clones are kept under gitignored `.local/`

## Historical Note

`implementation-gap-report.md` captures divergences discovered before this reconciliation pass.

## Security Note

`security/private-key-leakage-risk-assessment.md` tracks current private-key exposure risks and mitigation policy.

## Documentation Rules

- Document current behavior first.
- Mark future features explicitly as non-MVP.
- Keep API examples synchronized with actual tool names and input fields.
