# Documentation Changelog

## v0.16.1 - 2026-03-22T08:48:11+01:00

- Fixed `npm run test:ens` so it actually runs `test/ens.integration.test.ts` through a dedicated integration Vitest config.
- Made the live ENS integration suite require an explicit `ENS_RPC_URL` instead of depending on rate-limited public fallback RPCs; increased the integration-profile timeout to fit live runs.
- Added direct `set-profile` MCP handler regression coverage for missing sender key, `POLICY_IMMUTABLE`, and dual-write ENS record behavior.
- Reconciled README and product/testing docs with the current 12-tool MCP surface and active `stealthpay.v1.*` profile parsing behavior.

## v0.16.0 - 2026-03-22T07:04:23+01:00

- Refined README comparison section against Umbra/Fluidkey.
- Added explicit points on MCP-native agent interface and ENS programmable payment profiles.
- Clarified architecture positioning: StealthPay self-hostable MCP layer vs Fluidkey managed service components.
- Clarified stealth-standard positioning: Umbra origins vs StealthPay ERC-5564-style announcement/scan pipeline.

## v0.15.0 - 2026-03-22T06:52:40+01:00

- Reworked the README opening section with explicit hackathon context and official event links.
- Added a clearer problem framing for contextual agentic payments and privacy limits of reusable public addresses.
- Expanded solution overview with concise definitions of MCP and stealth addresses.
- Added explicit differentiation versus Umbra/Fluidkey (agent interface + ENS payment-context routing scope).
- Added concrete user-facing use cases for AI assistants, ops bots, checkout flows, and DAO/grant disbursements.

## v0.14.0 - 2026-03-21T18:12:37+01:00

- Added deployment re-check automation via `npm run check:deployments` (`scripts/check-deployments.mjs`).
- Added Sepolia fork integration test profile (`npm run test:fork`) with dedicated config (`vitest.fork.config.ts`) and initial send/scan/claim flow coverage.
- Added README security/testing guidance for fork tests and deployment verification commands.
- Updated network support docs with Hoodi status decision and deployment re-check command.
- Updated consolidated TODO to mark `P1 - Network / Deployment Clarity` and fork-profile evaluation as completed.

## v0.13.0 - 2026-03-21T17:58:17+01:00

- Added README security best-practice guidance to keep private keys out of chat/tool inputs and use env-only claim flows.
- Reconciled P0 documentation drift across examples/flows/specs to match the current 11 registered MCP endpoints.
- Updated network and endpoint testing docs to align with current recipient flow (`scan-announcements` + `claim-stealth-payment`).
- Added/updated deterministic test guidance and endpoint-surface guard references in testing docs.
- Updated `docs/TODO.md` status to mark completed P0/P2 items and keep remaining backlog focused.

## v0.12.0 - 2026-03-21T17:32:46+01:00

- Reviewed colleague security-fix commit (`91659d6`) and updated security assessment with verification status, timestamp, and residual-risk notes.
- Added consolidated backlog file `docs/TODO.md` and linked it from docs index.
- Updated README with explicit chain/contract requirements and live deployment check results (announcer/registry by chain).
- Clarified README tool surface to match current registered MCP endpoints and legacy helper status.
- Updated `docs/specifications/network-support.md` with requirements-by-feature and live deployment matrix.
- Updated `AGENT.md` policy to require maintaining `docs/TODO.md` in sync with code/docs changes.

## v0.11.0 - 2026-03-21T17:15:11+01:00

- Strengthened `AGENT.md` collaboration policy with explicit run-test/commit/push/pull-reconcile workflow and local-only `.local/` handling.
- Expanded README `Known limitations` and added a dedicated `Future improvements` section (including token-only stealth withdrawal gas constraint).
- Added `docs/security/private-key-leakage-risk-assessment.md` with current compliance status and remediation backlog.
- Updated docs index to include the new security assessment.

## v0.10.0 - 2026-03-21T16:42:27+01:00

- Added dependency evaluation note for ENS MCP and Umbra positioning in MVP architecture.
- Added test-suite structure note clarifying deterministic `*.test.ts` files vs executable `*-e2e.ts` scripts.
- Updated docs index with new architecture/testing references.

## v0.9.0 - 2026-03-21T16:26:50+01:00

- Added MCP endpoint testing coverage report with a full tool-to-test mapping.
- Documented deterministic test command strategy (`npm test`, `npm run test:tools`, `npm run test:ens`).
- Added Sepolia fork testing recommendation for transaction-heavy paths.

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
