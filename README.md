# StealthPay MCP

MCP server that gives AI agents the ability to make private payments using ENS identity and stealth addresses.

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
                                          6. Derive private key → control funds
                                          7. Withdraw to any wallet
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
```

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

Then restart Claude Code. The 9 tools will be available immediately.

## Tools

### Onboarding

| Tool | Description |
|------|-------------|
| `register-ens-name` | Register a .eth name (commit → wait → register flow, ~65s) |
| `register-stealth-keys` | Generate spending/viewing keypairs and set the stealth-meta-address text record on your ENS name |

### Sending payments

| Tool | Description |
|------|-------------|
| `get-payment-profile` | Resolve ENS name → address, avatar, preferred chain/token, stealth meta-address |
| `generate-stealth-address` | Generate a one-time stealth address from an ENS name |
| `send-stealth-payment` | Send stablecoins to a stealth address + announce via ERC-5564 |
| `create-payment-link` | Generate a shareable payment link |

### Receiving payments

| Tool | Description |
|------|-------------|
| `scan-announcements` | Scan ERC-5564 events to discover payments addressed to you |
| `derive-stealth-key` | Compute the private key that controls a stealth address |
| `withdraw-from-stealth` | Transfer funds from a stealth address to your wallet |

## Supported chains

Ethereum, Base, Optimism, Arbitrum, Polygon, Gnosis, Sepolia, Hoodi

## Testing

```bash
# Unit tests (stealth math, payment links — no network)
npm run test:unit

# ENS integration test (reads mainnet ENS)
npm run test:ens

# Full Sepolia E2E (send → announce → scan → derive)
# Requires SENDER_PRIVATE_KEY with Sepolia ETH
npm run test:e2e

# ENS flow E2E (resolve ENS → stealth address → send → scan)
npx tsx test/ens-e2e.ts

# Register ENS name + set stealth keys E2E
npx tsx test/register-e2e.ts <label>
```

### Get Sepolia testnet ETH

1. Go to https://sepoliafaucet.com
2. Paste your wallet address
3. Run `npm run test:e2e`

## Architecture

```
src/
├── index.ts                 # MCP server entry point
├── config.ts                # Chain configs, contract addresses, ABIs
├── lib/
│   ├── stealth.ts           # ERC-5564 stealth address math (secp256k1)
│   ├── ens.ts               # ENS resolution + stealth meta-address lookup
│   ├── ens-register.ts      # ENS name registration + text record setting
│   ├── payments.ts          # Stablecoin transfer + ERC-5564 announcement
│   ├── scanner.ts           # Scan Announcement events, discover payments
│   └── withdraw.ts          # Withdraw funds from stealth addresses
└── tools/                   # MCP tool wrappers (thin layer over lib/)
    ├── register-ens-name.ts
    ├── register-stealth-keys.ts
    ├── get-payment-profile.ts
    ├── generate-stealth-address.ts
    ├── send-stealth-payment.ts
    ├── create-payment-link.ts
    ├── scan-announcements.ts
    ├── derive-stealth-key.ts
    └── withdraw-from-stealth.ts
```

## Standards

- [ERC-5564](https://eips.ethereum.org/EIPS/eip-5564) — Stealth Addresses (announcement)
- [ERC-6538](https://eips.ethereum.org/EIPS/eip-6538) — Stealth Meta-Address Registry
- [MCP](https://modelcontextprotocol.io) — Model Context Protocol

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server |
| `@noble/secp256k1` | Elliptic curve math |
| `@noble/hashes` | Hashing (peer dep) |
| `viem` | ENS + transactions + keccak256 |
| `zod` | Input validation |
| `dotenv` | Environment variable loading |

## Known limitations

- **Gas for stealth addresses**: Stealth addresses are empty EOAs — the recipient needs ETH for gas to withdraw tokens. Future improvement: ERC-4337 paymaster.
- **Hoodi testnet**: Connected but ERC-5564/6538 contracts not yet deployed.
- **Metadata format**: The scanner assumes the metadata format used by this project. Other ERC-5564 senders may use different layouts.

## License

MIT
