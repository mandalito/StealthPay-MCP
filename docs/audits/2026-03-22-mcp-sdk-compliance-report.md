# MCP SDK Compliance Report (Anthropic TypeScript SDK)

Date: 2026-03-22  
Project: `StealthPay-MCP`  
Requested scope: compare current MCP implementation to the official MCP TypeScript SDK pulled into `.local`.

## Sources Used

- Cloned SDK repo: `.local/mcp-typescript-sdk`
  - `main` HEAD: `ccb78f20438a853f0205b8ed7f642af7780208e6`
  - `origin/v1.x` branch (the line used by your current dependency)
- Project code:
  - `src/index.ts`
  - `src/tools/*.ts`
  - `package.json`

## Baseline Selection

The cloned SDK `main` branch is v2 pre-alpha, and the SDK itself states that v1.x is still the recommended production line.

- v2 pre-alpha notice: `.local/mcp-typescript-sdk/README.md` lines 3-7
- Your project currently depends on v1:
  - `package.json` line 26 (`@modelcontextprotocol/sdk: ^1.27.0`)

Because of this, the primary compliance check below is against **SDK v1.27.x semantics**, with a separate v2-readiness note.

## Executive Verdict

- **v1 MCP SDK compliance:** **Mostly compliant**, with one important dependency mismatch.
- **v2 MCP SDK compliance:** **Not yet migrated** (expected for now, not a protocol failure).

## Detailed Findings

### 1) Zod dependency is below the SDK-supported range (High)

The SDK v1 docs/package require Zod `v3.25+` or `v4`:

- `.local/mcp-typescript-sdk` `origin/v1.x` README line 32
- `.local/mcp-typescript-sdk` `origin/v1.x` package.json lines 109 and 114

Current project uses:

- `package.json` line 30: `zod: ^3.23.0`

Impact:

- This is outside the SDK’s declared supported peer range and can create runtime/typing incompatibilities.

### 2) Core MCP server/tool registration model is aligned (Pass)

Observed alignment with v1 SDK patterns:

- Uses `McpServer` + `StdioServerTransport` (`src/index.ts` lines 2-3, 20, 47-49)
- Registers tools via `registerTool(...)` across all tool modules (`src/tools/*.ts`)
- Uses `isError: true` for tool-level failures (aligned with SDK/server docs behavior)

Reference SDK semantics:

- Tool list/call handling and capability registration in `origin/v1.x` `src/server/mcp.ts` lines 130-175 and 177-234.
- Error result style in `origin/v1.x` `src/server/mcp.ts` lines 243-252.

### 3) Output schema usage is partially adopted (Medium)

Current status:

- 5 tools define `outputSchema` + `structuredContent` on success:
  - `generate-stealth-address`
  - `get-payment-profile`
  - `send-stealth-payment`
  - `scan-announcements`
  - `claim-stealth-payment`
- 7 tools still return text-only without `outputSchema`.

SDK behavior note:

- If a tool defines `outputSchema`, the SDK enforces that successful results include `structuredContent` (`origin/v1.x` `src/server/mcp.ts` lines 301-305). Your schema-enabled tools satisfy this.

Impact:

- Protocol-compliant, but uneven machine-readability across tools reduces interoperability for strict clients.

### 4) Tool annotations are not used (Low)

SDK docs support tool annotations (read-only/destructive hints) to improve client UX and safer tool presentation.

- Reference: SDK server guide tool annotations section.

Impact:

- Not a protocol violation, but missed interoperability/UX signal for agent hosts.

### 5) v2 migration gap (Informational)

Against SDK `main` (v2 pre-alpha), project is not migrated yet:

- Still on monolithic `@modelcontextprotocol/sdk` import path (`src/index.ts`, all tools).
- v2 expects split packages (`@modelcontextprotocol/server`, etc.) per migration guide.

This is expected given v1 remains recommended for production today.

## Verification Performed

- `npm run build` -> pass
- `npm run test:tools` -> pass (12 files, 30 tests)

## Recommended Next Steps

1. Upgrade `zod` to a supported range (`^3.25.x` or `^4.x`) to match SDK v1 contract.
2. Extend `outputSchema` + `structuredContent` to remaining tools for consistent machine-readable results.
3. Add tool `annotations` for risk signaling (read-only/destructive/idempotent hints).
4. Keep tracking v2 migration, but treat it as planned modernization rather than an immediate compliance blocker.

