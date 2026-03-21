# Private Key Leakage Risk Assessment

Generated: 2026-03-21T17:31:00+01:00
Updated: 2026-03-21T17:33:20+01:00
Branch: `main`
Reference fix commit: `91659d6`

## Scope

- MCP tool wrappers in `src/tools/*`
- Sensitive key handling behavior in test utilities under `test/*`
- Local secret storage conventions (`.env`, `.gitignore`)

## Policy Target

Agent and MCP flows should never expose private keys (sender keys, recipient spending/viewing keys, or derived stealth private keys) to chat/tool outputs.

## Compliance Status

**Compliant for currently registered MCP endpoints.**

## Findings Verification

| # | Finding | Severity | Remediation | Status |
|---|---------|----------|-------------|--------|
| 1 | `derive-stealth-key` accepts private keys as input and returns stealth private key in output | High | Tool removed from registered MCP tools. Lib function retained for internal use by `claim-stealth-payment`. | ✅ Fixed |
| 2 | `withdraw-from-stealth` requires `stealthPrivateKey` as tool input | High | Tool removed from registered MCP tools. `claim-stealth-payment` handles derive+withdraw internally. | ✅ Fixed |
| 3 | `scan-announcements` allows optional explicit `viewingPrivateKey` input | Medium | Removed key params from input schema. Keys read from env vars only. | ✅ Fixed |
| 4 | `test/register-e2e.ts` prints private keys to stdout | Low | Gated behind `DEBUG=true` flag. | ✅ Fixed |

Validation run:

- `npm run test:tools` passed on 2026-03-21T17:30:59+01:00.

## Current Controls

- `.env` is gitignored and not tracked.
- `.local/` is gitignored for local probes/SDK clones.
- `claim-stealth-payment` derives + withdraws using env keys without returning private keys to AI.
- `register-stealth-keys` persists keys locally in `.env` — never returns them in tool output.
- `scan-announcements` reads keys from env only — no key params in input schema.
- `generate-wallet` saves key to `.env` — returns only the address.
- `derive-stealth-key` and `withdraw-from-stealth` are no longer registered as MCP tools.
- E2E test key output gated behind `DEBUG=true`.

## Remaining Tools That Handle Secrets (Server-Side Only)

| Tool | Secret | How handled |
|------|--------|-------------|
| `send-stealth-payment` | `SENDER_PRIVATE_KEY` | Read from env, signs tx internally |
| `register-ens-name` | `SENDER_PRIVATE_KEY` | Read from env, signs tx internally |
| `register-stealth-keys` | `SENDER_PRIVATE_KEY` + generates keys | Read from env, saves to env, never returned |
| `scan-announcements` | `RECIPIENT_VIEWING_PRIVATE_KEY` | Read from env only |
| `claim-stealth-payment` | `RECIPIENT_SPENDING/VIEWING_PRIVATE_KEY` | Read from env, derives + withdraws internally |

All secrets stay within the Node.js process boundary.

## Residual Risks / Follow-up

1. `src/tools/derive-stealth-key.ts` and `src/tools/withdraw-from-stealth.ts` still exist in the repository and could reintroduce leakage risk if re-registered later.
2. Debug mode (`DEBUG=true`) intentionally prints keys in `test/register-e2e.ts`; this is acceptable for local troubleshooting only and must never be used with real funds.
