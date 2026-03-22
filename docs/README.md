# Documentation Hub

This folder tracks the current implementation baseline for the hackathon.

## Documentation Tree

```text
docs/
  README.md
  TODO.md
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
  audits/
    2026-03-22-mcp-interoperability-compliance-audit.md
    2026-03-22-payment-profile-standards-alignment-report.md
```

## Current Baseline

- Hackathon testnet decision: Sepolia
- Registered MCP endpoint surface is currently 13 tools (`src/index.ts`).
- Recipient flow baseline is `scan-announcements` -> `claim-stealth-payment` (keys remain server-side).
- Payment profiles use CAIP-normalized `stealthpay.v1.*` ENS namespace with legacy fallback.
- Agent spend policy engine enforces per-tx caps, daily limits, and allowlists.
- Encrypted notes supported via ChaCha20-Poly1305 with ECDH key derivation.
- Machine-readable JSON Schema published at `schemas/payment-profile.schema.json`.
- Local helper scripts and external SDK clones are kept under gitignored `.local/`

## Historical Note

`implementation-gap-report.md` captures divergences discovered before this reconciliation pass.

## Security Note

`security/private-key-leakage-risk-assessment.md` tracks current private-key exposure risks and mitigation policy.

## Documentation Rules

- Document current behavior first.
- Mark future features explicitly as non-MVP.
- Keep API examples synchronized with actual tool names and input fields.
- Keep `TODO.md` updated as the single consolidated backlog.
