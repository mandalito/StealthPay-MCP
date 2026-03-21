# System Overview (Current)

## High-Level Components

- MCP server (`src/index.ts`)
- Tool handlers (`src/tools/*`)
- ENS utilities (`src/lib/ens.ts`, `src/lib/ens-register.ts`)
- Stealth cryptography (`src/lib/stealth.ts`)
- Payment execution (`src/lib/payments.ts`)
- Recipient discovery and claiming (`src/lib/scanner.ts`, `src/lib/withdraw.ts`)

## Runtime Flow (Sender)

1. Resolve ENS + stealth metadata.
2. Generate one-time stealth address.
3. Send transfer.
4. Announce payment via ERC-5564.

## Runtime Flow (Recipient)

1. Scan announcements.
2. Filter and match recipient keys.
3. Derive stealth private key.
4. Withdraw funds.

## Infrastructure

- JSON-RPC via `viem`
- ENS contracts (mainnet/sepolia contexts)
- ERC-5564 announcer
- ERC-6538 registry fallback lookup
