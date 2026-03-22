# StealthPay MCP

StealthPay MCP is a hackathon project built for:

- [BSA EPFL Hackathon](https://hackathon.bsaepfl.com/)
- [DoraHacks - BSA Stablecoins & Payments Track](https://dorahacks.io/hackathon/bsa-stablecoins-payments/detail)

It is an MCP server that gives AI agents the ability to make contextual, private crypto payments using ENS identity and stealth addresses.

## Problem

Agentic crypto payments are still not contextual enough:

1. An agent may know the recipient identity, but not their payment preferences (chain, token, UX constraints).
2. ENS identity is human-readable, but often not structured as machine-usable payment instructions.
3. Reusing one public address for many receipts creates onchain correlation and harms privacy.

StealthPay targets this double problem: smarter machine-readable payment routing, plus private receiving with one-time stealth addresses.

## Solution

StealthPay MCP turns an ENS name into a machine-usable payment endpoint:

- reads recipient payment preferences from CAIP-normalized ENS profile data (`stealthpay.v1.*` namespace)
- builds the payment path for the right chain/token context with stealth/note policy enforcement
- uses stealth-address flow (ERC-5564-style announcements) for private receipt discovery
- encrypts payment notes using recipient viewing keys (ChaCha20-Poly1305)
- enforces agent spend policy controls (per-tx caps, daily limits, chain/token/destination allowlists)

### What is MCP?

MCP (Model Context Protocol) is a standard way for AI clients/agents to call external tools.  
In this project, MCP tools expose payment capabilities (`get-payment-profile`, `send-stealth-payment`, `scan-announcements`, `claim-stealth-payment`) in a structured, automatable interface.

### What is a stealth address?

A stealth address is a one-time recipient address derived from a published stealth meta-address.  
Each payment can use a fresh address, so receipts are harder to correlate publicly while still being recoverable by the intended recipient.

## How StealthPay differs from Umbra / Fluidkey

StealthPay is not trying to replace those products. It focuses on a different layer:

1. **MCP-native (agentic) interface**: StealthPay exposes tools through MCP for AI/agent orchestration; Umbra and Fluidkey are not MCP tool surfaces.
2. **Programmable payment profiles**: StealthPay routes payments from ENS-stored machine-readable preferences (chain/token/UX policy), not only identity lookup.
3. **Centralization model**: StealthPay is an open, self-hostable MCP server; Fluidkey is a managed product with centralized service components.
4. **Stealth standard positioning**: Umbra pioneered stealth payments, but its original architecture predates the latest stealth-address standardization work; StealthPay targets ERC-5564-style announcement/scan flows in an agent-friendly pipeline.
5. **End-to-end machine flow**: resolve identity -> generate stealth destination -> pay -> scan -> claim, from one MCP surface.

## Example use cases

- AI assistant pays a freelancer from a plain request: "Send 50 USDC to alice.eth privately."
- Operations bot executes recurring payouts to contributors while preserving recipient privacy.
- Checkout/commerce assistant generates ENS-based private payment links for one-off customer settlements.
- DAO/grant tooling sends disbursements with identity-level routing and reduced receipt linkage.

Send crypto to anyone with an ENS name — privately. The recipient's address is never reused or publicly linked to their identity.

## How it works

```
Sender (AI agent)                         Recipient
────────────────                          ─────────
1. Look up bob.eth                        (published stealth meta-address)
2. Generate one-time stealth address      ← fresh address, unlinkable to bob.eth
3. Send tokens to stealth address         ← on-chain transfer
4. Announce via ERC-5564                  ← so recipient can discover it
                                          5. Scan announcements → find payment
                                          6. Claim via `claim-stealth-payment`
                                             (derive + withdraw server-side)
```

Nobody except the recipient can tell they received the payment. The stealth address has never appeared on-chain before and cannot be linked to their public ENS name.

## Quick start

### Install

```bash
git clone https://github.com/mandalito/StealthPay-MCP.git
cd StealthPay-MCP
npm install
npm run build
```

### Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required: wallet private key for sending payments / registering ENS names
SENDER_PRIVATE_KEY=0x<your-private-key>

# For testnet: set ENS resolution to Sepolia
ENS_CHAIN=sepolia

# Optional: custom RPC endpoints (defaults to public RPCs)
# RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
# ENS_RPC_URL=https://...

# Optional: recipient keys (for scan/claim flows)
# Fill these from `register-stealth-keys` output
# RECIPIENT_SPENDING_PRIVATE_KEY=0x...
# RECIPIENT_SPENDING_PUBLIC_KEY=0x...
# RECIPIENT_VIEWING_PRIVATE_KEY=0x...
# RECIPIENT_VIEWING_PUBLIC_KEY=0x...

# Optional: agent spend policy controls
# POLICY_MAX_PER_TX=0.1                    # Per-transaction cap in ETH (default: 0.1)
# POLICY_MAX_DAILY_SPEND=1.0               # Rolling 24h limit in ETH (default: 1.0)
# POLICY_CHAIN_ALLOWLIST=sepolia,base       # Comma-separated; empty = all allowed
# POLICY_TOKEN_ALLOWLIST=ETH,USDC           # Comma-separated; empty = all allowed
# POLICY_DESTINATION_ALLOWLIST=alice.eth     # Comma-separated; empty = all allowed
# POLICY_ADMIN_ADDRESS=0x...                # Admin key for signed policy updates
# POLICY_IMMUTABLE=false                    # If true, blocks agent policy field changes via set-profile
# POLICY_VERSION=0                          # Policy schema version (for rollback protection)
# POLICY_EFFECTIVE_AT=2026-01-01T00:00:00Z  # ISO 8601 policy effective timestamp
```

Recipient key handling:

- `register-stealth-keys` generates recipient keys and saves them directly to local `.env`.
- Private keys are not returned through MCP output to the AI/client surface.
- Only the stealth meta-address is written on-chain; private keys are never stored on-chain.
- `.env` is gitignored, so these secrets stay local unless you export them elsewhere.

## Security Model

StealthPay MCP follows one non-negotiable rule:
**private keys must never be exposed to the agent model under any circumstances.**

### Key philosophy

- Agents can trigger MCP tools, but they must not receive private key material in tool inputs or outputs.
- This includes sender account keys, recipient spending/viewing keys, and derived stealth private keys.
- Secret material should remain inside the MCP runtime boundary only.

### Operator responsibilities (install/deploy)

- Store keys in a secure local haven on your device (OS keychain, encrypted secret store, or equivalent).
- Ensure the secret store is reachable by MCP runtime but not directly reachable by the agent process.
- Never paste keys into chat, prompts, or tool arguments.
- Prefer runtime secret injection over plaintext files when possible.
- If you use `.env` for local development, keep it local, gitignored, permission-restricted, and outside shared/synced folders.
- Rotate any key immediately if exposure is suspected.

### Current security controls in this repo

- `register-stealth-keys` writes generated keys locally and does not return private keys in MCP output.
- `scan-announcements` and `claim-stealth-payment` use env-only recipient key paths; key-bearing inputs are not part of tool schemas.
- Derived stealth private keys are used server-side for claim execution and are never returned to agent/client output.
- `derive-stealth-key` and `withdraw-from-stealth` are not registered MCP tools.
- Agent spend policy engine (`src/lib/policy.ts`) enforces per-tx caps, daily limits, and allowlists on every transaction path.
- `POLICY_IMMUTABLE=true` prevents agents from modifying policy fields via `set-profile`.
- Signed policy updates require a pinned `POLICY_ADMIN_ADDRESS` with version monotonicity (rollback protection).
- All policy events (load, check pass/fail, update accept/reject) are audit-logged to stderr.
- A test (`test/tools/no-secrets-in-docs.test.ts`) scans docs/examples for private-key-like hex strings.

### Operational recommendations

- Use dedicated low-fund operational wallets, not personal main wallets.
- Do not run `DEBUG=true` test flows with real funds/keys.
- Treat logs, chat history, shell history, and screenshots as sensitive channels.
- Set `POLICY_MAX_PER_TX` and `POLICY_MAX_DAILY_SPEND` to appropriate limits for your use case.
- Set `POLICY_IMMUTABLE=true` in production to prevent agents from modifying payment policies.

### Add to Claude Code

**Global** (available in all projects) — add to `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "stealthpay": {
      "command": "node",
      "args": ["/absolute/path/to/StealthPay-MCP/dist/index.js"],
      "cwd": "/absolute/path/to/StealthPay-MCP"
    }
  }
}
```

**Project-only** — add a `.mcp.json` in your project root with the same content.

Then restart Claude Code. The 13 registered tools will be available immediately.

## Tools

### Identity

| Tool | Description |
|------|-------------|
| `get-my-profile` | Show current wallet, reverse ENS name, payment profile, and recipient-key status |
| `generate-wallet` | Generate and persist a local sender wallet in `.env` |
| `get-balances` | Check native/token balances of your sender wallet on a selected chain |

### Onboarding & Profile

| Tool | Description |
|------|-------------|
| `register-ens-name` | Register a .eth name (commit → wait → register flow, ~65s) |
| `register-stealth-keys` | Generate spending/viewing keypairs and set the stealth-meta-address text record on your ENS name |
| `set-profile` | Set payment preferences on your ENS name: preferred chain, token, stealth policy, and note preferences. Writes to both `stealthpay.v1.*` and legacy ENS text records. |
| `set-primary-name` | Set the ENS reverse record so your wallet address resolves back to your ENS name. |

### Sending payments

| Tool | Description |
|------|-------------|
| `get-payment-profile` | Resolve ENS name → address, avatar, CAIP-normalized chain/token preferences, stealth meta-address, stealth/note policies |
| `generate-stealth-address` | Generate a one-time stealth address from an ENS name |
| `send-stealth-payment` | Send ETH / stablecoins / ERC-20 to a stealth address + announce via ERC-5564. Enforces recipient stealth/note policies and agent spend limits. Supports encrypted memos. |
| `create-payment-link` | Generate a shareable payment link (web URL + ERC-681 URI) |

### Receiving payments

| Tool | Description |
|------|-------------|
| `scan-announcements` | Scan ERC-5564 events to discover payments addressed to you |
| `claim-stealth-payment` | Derive + withdraw in one step using locally stored recipient keys (keys never pass through AI) |

## Chain support and requirements

StealthPay flows depend on different on-chain requirements depending on the feature:

- ENS onboarding/resolution (`register-ens-name`, `register-stealth-keys`, `get-payment-profile`, `generate-stealth-address`) requires ENS contracts and an ENS-capable RPC on the selected `ENS_CHAIN`.
- Stealth payment flows (`send-stealth-payment`, `scan-announcements`, `claim-stealth-payment`) require:
  - ERC-5564 announcer deployment
  - ERC-6538 registry deployment
  - reachable RPC on the payment chain

Live deployment check (via `eth_getCode`) on **2026-03-21** for configured singleton addresses:

| Chain | ERC-5564 announcer (`0x5564...5564`) | ERC-6538 registry (`0x6538...6538`) |
|------|---------------------------------------|--------------------------------------|
| ethereum | deployed | deployed |
| base | deployed | deployed |
| optimism | deployed | deployed |
| arbitrum | deployed | deployed |
| polygon | deployed | deployed |
| gnosis | deployed | deployed |
| sepolia | deployed | deployed |
| hoodi | not deployed | not deployed |

### ENS requirements

- ENS registration and resolver write operations are currently implemented for `sepolia` and `ethereum` only (see `ENS_CONTRACTS`).
- ENS resolution defaults to `ethereum` unless `ENS_CHAIN=sepolia` is set.
- Hackathon baseline uses Sepolia for both ENS and payment execution.

### Practical support summary

- **Operational now**: `ethereum`, `base`, `optimism`, `arbitrum`, `polygon`, `gnosis`, `sepolia` (for stealth announcement/scan primitives).
- **Not operational yet**: `hoodi` (contracts missing at configured singleton addresses).

## Programmable payment profile

StealthPay implements CAIP-normalized payment profiles using the `stealthpay.v1.*` ENS text record namespace. The `set-profile` tool writes both namespaced v1 keys and legacy keys for backwards compatibility. The `get-payment-profile` tool reads v1 keys first, with legacy fallback.

**Canonical keys (`stealthpay.v1.*`):**

| Key | Type | Example |
|-----|------|---------|
| `stealthpay.v1.profile_version` | string | `"1"` |
| `stealthpay.v1.preferred_chains` | CSV | `"eip155:8453,eip155:10"` (CAIP-2) |
| `stealthpay.v1.preferred_assets` | CSV | `"eip155:8453/erc20:0x833..."` (CAIP-19) |
| `stealthpay.v1.stealth_policy` | enum | `required \| preferred \| optional \| disabled` |
| `stealthpay.v1.stealth_scheme_ids` | CSV | `"1"` |
| `stealthpay.v1.note_policy` | enum | `required \| optional \| none` |
| `stealthpay.v1.note_max_bytes` | number | `"140"` |
| `stealthpay.v1.note_privacy` | enum | `plaintext \| encrypted \| hash_only` |

**Legacy keys** (`avatar`, `chain`, `token`, `stealth-meta-address`, `description`) are still read as fallbacks and written alongside v1 keys during the migration window.

A machine-readable JSON Schema is published at `schemas/payment-profile.schema.json`.

### Announcement metadata format

Stealth transfer announcement metadata (ERC-5564 event payload) is encoded as:

- `viewTag` (1 byte)
- `selector` (4 bytes, ERC-20 transfer selector or `0x00000000` for native)
- `tokenAddress` (20 bytes, `0x00...00` for native ETH)
- `amount` (32 bytes, uint256)
- `memo` (variable bytes, UTF-8 plaintext, encrypted envelope, or keccak256 hash — per recipient `notePrivacy` preference)

## Testing

```bash
# Endpoint contract tests (all MCP tools, mocked deps)
npm run test:tools

# Unit tests (stealth math, payment links — no network)
npm run test:unit

# Default deterministic suite (unit + tool tests)
npm test

# ENS integration test (reads mainnet ENS; set ENS_RPC_URL for a reliable run)
npm run test:ens

# Re-check onchain singleton deployments across configured chains
npm run check:deployments

# Sepolia fork integration (on-demand)
# Uses SEPOLIA_FORK_URL (or RPC_URL fallback) as fork upstream.
# Set FORK_REQUIRED=true to fail hard if fork node cannot start.
npm run test:fork

# Full Sepolia E2E (send → announce → scan → claim)
# Requires SENDER_PRIVATE_KEY with Sepolia ETH
npm run test:e2e

# ENS flow E2E (resolve ENS → stealth address → send → scan)
npx tsx test/ens-e2e.ts

# Register ENS name + set stealth keys E2E
npx tsx test/register-e2e.ts <label>
```

Notes:

- `*.test.ts` files are deterministic Vitest suites.
- `*-e2e.ts` files are executable integration runners (live-network utilities), not part of default `npm test`.

### Get Sepolia testnet ETH

1. Go to https://sepoliafaucet.com
2. Paste your wallet address
3. Run `npm run test:e2e`

## Architecture

```
src/
├── index.ts                 # MCP server entry point (12 registered tools)
├── config.ts                # Chain configs, contract addresses, ABIs, CAIP helpers
├── lib/
│   ├── stealth.ts           # ERC-5564 stealth address math (secp256k1)
│   ├── ens.ts               # ENS resolution + payment profile (dual-read v1/legacy)
│   ├── ens-register.ts      # ENS name registration + text record setting
│   ├── profile.ts           # Payment profile types, ENS key mappings, validation
│   ├── payments.ts          # Token transfer + ERC-5564 announcement + note encryption
│   ├── scanner.ts           # Scan Announcement events, discover payments
│   ├── withdraw.ts          # Withdraw funds from stealth addresses
│   ├── policy.ts            # Agent spend policy engine (caps, limits, allowlists, audit)
│   └── note-encryption.ts   # Encrypted notes (ChaCha20-Poly1305, baseline + dual-envelope)
└── tools/                   # MCP tool wrappers (thin layer over lib/)
    ├── register-ens-name.ts
    ├── register-stealth-keys.ts
    ├── set-profile.ts
    ├── get-payment-profile.ts
    ├── generate-stealth-address.ts
    ├── send-stealth-payment.ts
    ├── create-payment-link.ts
    ├── get-my-profile.ts
    ├── generate-wallet.ts
    ├── get-balances.ts
    ├── scan-announcements.ts
    └── claim-stealth-payment.ts
schemas/
└── payment-profile.schema.json  # Machine-readable JSON Schema for payment profiles
```

## Local Helpers (`.local/`)

`.local/` is a gitignored workspace for local-only artifacts:

- cloned external repos used for reference (for example Umbra SDK source)
- temporary MCP probe scripts (`.mjs`) used to exercise tools over stdio during debugging

These scripts are not part of the production server and are not committed.

## Standards

- [ERC-5564](https://eips.ethereum.org/EIPS/eip-5564) — Stealth Addresses (announcement)
- [ERC-6538](https://eips.ethereum.org/EIPS/eip-6538) — Stealth Meta-Address Registry
- [MCP](https://modelcontextprotocol.io) — Model Context Protocol

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server |
| `@noble/secp256k1` | Elliptic curve math (stealth addresses, ECDH) |
| `@noble/hashes` | Hashing (HKDF-SHA256, keccak256 peer dep) |
| `@noble/ciphers` | Symmetric encryption (ChaCha20-Poly1305 for encrypted notes) |
| `viem` | ENS + transactions + keccak256 |
| `zod` | Input validation |
| `dotenv` | Environment variable loading |

## Known limitations

- **Token-only stealth account cannot withdraw without native gas**: If a stealth account receives non-native tokens but has `0` native ETH, withdrawal fails until gas is funded. Gasless/paymaster is not in hackathon MVP scope.
- **Hoodi testnet status**: Chain config exists, but production-grade ERC-5564/6538 readiness remains unvalidated for this repo.
- **Metadata format compatibility**: Scanner parsing assumes this project's metadata conventions; other ERC-5564 senders may encode differently.
- **In-memory spend ledger**: Daily spend tracking is in-process only and resets on server restart. Persistent storage is a future enhancement.

## Future improvements

- Add ERC-4337/paymaster withdrawal flow so stealth accounts can move token-only balances without pre-funding native gas.
- Add `send-stealth-payment` mode for unsigned payload generation (`build_unsigned_tx`) in addition to direct execution.
- Improve scan performance/reliability with indexed backends (subgraph/indexer) and rate-limit-aware pagination.
- Persist spend ledger to disk or external store for daily limit continuity across restarts.
- Complete Umbra SDK integration path where it improves maintainability without breaking current ERC-5564/6538 behavior.

## License

MIT
