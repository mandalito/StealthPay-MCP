# Documentation Changelog

## v0.8.0 - 2026-03-21T16:07:40+01:00

- Documented `.local/` usage for local MCP probe scripts (`mcp-*.mjs`) and SDK clones.
- Added guidance to persist `register-stealth-keys` outputs in local `.env` recipient variables (`RECIPIENT_*`).
- Updated quick-start and collaboration docs to clarify where stealth private keys are stored (local only, not on-chain).

## v0.7.0 - 2026-03-21T15:02:13+01:00

- Reconciled docs with current 9-tool implementation (onboarding, sender, recipient flows).
- Updated architecture/spec/examples to reflect direct RPC + local module design.
- Set Sepolia as hackathon testnet baseline in documentation.
- Added Vitest exclusion guidance by updating test config to ignore `.local/**`.

## v0.6.0 - 2026-03-21T13:11:58+01:00

- Added `docs/implementation-gap-report.md` to compare implementation against current documentation.
- Added report links in README and docs index.

## v0.5.0 - 2026-03-21T12:23:17+01:00

- Marked gasless transactions as future development (not hackathon MVP scope).
- Added `docs/specifications/network-support.md` with current Hoodi support status.
- Added README/docs index links for network support documentation.

## v0.4.0 - 2026-03-21T12:21:59+01:00

- Updated `send-stealth-payment` spec to support dual execution modes:
  `execute` and `build_unsigned_tx`.
- Updated flows and examples to document both execution paths.

## v0.3.0 - 2026-03-21T12:20:57+01:00

- Added a concrete ENS text-record freeze proposal in `docs/specifications/ens-text-record-keys.md`.
- Linked payment profile mapping to the canonical ENS key specification.

## v0.2.0 - 2026-03-21T12:06:48+01:00

- Updated documentation to the composed architecture: Umbra Protocol SDK + ENS MCP + EVM MCP.
- Aligned MCP tool names with current design diagram.
- Added MCP composition architecture documentation.

## v0.1.0 - 2026-03-21T11:57:15+01:00

- Initialized documentation tree.
- Added baseline specs, architecture notes, payment flows, examples, and collaboration workflow.
