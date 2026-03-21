# Private Key Leakage Risk Assessment

Generated: 2026-03-21T17:31:00+01:00  
Branch: `main`

## Scope

- MCP tool wrappers in `src/tools/*`
- Sensitive key handling behavior in test utilities under `test/*`
- Local secret storage conventions (`.env`, `.gitignore`)

## Policy Target

Agent and MCP flows should never expose private keys (sender keys, recipient spending/viewing keys, or derived stealth private keys) to chat/tool outputs.

## Compliance Status

**Not fully compliant (High risk).**

## Findings

1. `derive-stealth-key` accepts private keys as optional input and returns the derived stealth private key in tool output.
2. `withdraw-from-stealth` requires `stealthPrivateKey` as tool input, which can expose secrets in client traces.
3. `scan-announcements` still allows optional explicit `viewingPrivateKey` input (even if env defaults exist).
4. `test/register-e2e.ts` prints generated spending/viewing private keys to stdout.

## Positive Controls Already Present

- `.env` is gitignored and not tracked.
- `.local/` is gitignored for local probes/SDK clones.
- `claim-stealth-payment` derives + withdraws using local env keys without returning private keys.
- `register-stealth-keys` persists keys locally in `.env` for recipient flows.

## Immediate Operating Guidance (Hackathon)

1. Use `claim-stealth-payment` for claiming funds; avoid `derive-stealth-key` and `withdraw-from-stealth` in normal operations.
2. Do not pass key parameters in MCP prompts or tool arguments.
3. Keep all recipient/sender secrets only in local `.env`.
4. If any key appears in logs/chat/output, rotate keys immediately and treat as a security incident.

## Remediation Backlog

1. Remove private-key fields from MCP input schemas where possible.
2. Stop returning private keys in tool responses; return only non-sensitive references/status.
3. Convert recipient flows to env-only server-side key usage.
4. Remove key-printing behavior from e2e scripts, or gate behind explicit local debug flags.
