# System Overview (Current)

## High-Level Components

- MCP server (`src/index.ts`) — 12 registered tools
- Tool handlers (`src/tools/*`)
- ENS utilities (`src/lib/ens.ts`, `src/lib/ens-register.ts`)
- Payment profile schema (`src/lib/profile.ts`) — types, ENS key mappings, validation
- Stealth cryptography (`src/lib/stealth.ts`)
- Payment execution (`src/lib/payments.ts`) — transfer + ERC-5564 announcement + note encryption
- Recipient discovery and claiming (`src/lib/scanner.ts`, `src/lib/withdraw.ts`)
- Agent spend policy engine (`src/lib/policy.ts`) — per-tx caps, daily limits, allowlists, signed governance, audit logging
- Encrypted notes (`src/lib/note-encryption.ts`) — ChaCha20-Poly1305 with ECDH key derivation, baseline + dual-envelope modes

## Runtime Flow (Sender)

1. Resolve ENS + stealth metadata + payment profile (CAIP-normalized).
2. Enforce recipient stealth policy and note policy.
3. Check agent spend policy (per-tx cap, daily limit, allowlists).
4. Generate one-time stealth address.
5. Encrypt memo if recipient `notePrivacy` requires it.
6. Send transfer.
7. Announce payment via ERC-5564.
8. Record spend for daily limit tracking.

## Runtime Flow (Recipient)

1. Scan announcements.
2. Filter and match recipient keys.
3. Decode memo from announcement metadata.
4. Check agent spend policy (destination allowlist).
5. Claim payment via `claim-stealth-payment` (derivation + withdrawal happen server-side).

## Infrastructure

- JSON-RPC via `viem`
- ENS contracts (mainnet/sepolia contexts)
- ERC-5564 announcer
- ERC-6538 registry fallback lookup
- CAIP-2/19 normalization for chain/asset identifiers
