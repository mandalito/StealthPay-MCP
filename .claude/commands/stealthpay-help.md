Show all available StealthPay commands and tools.

Display this help overview:

## StealthPay Commands

| Command | Description |
|---------|-------------|
| `/stealthpay-generate-wallet` | Generate a new wallet (key saved to .env, never exposed to AI) |
| `/stealthpay-setup` | Full onboarding: wallet check, ENS registration, stealth key setup |
| `/stealthpay-me` | Show your wallet address, ENS name, and stealth payment profile |
| `/stealthpay-profile <name.eth>` | Look up anyone's payment profile |
| `/stealthpay-send` | Send a stealth payment (e.g., "50 USDC to alice.eth") |
| `/stealthpay-scan` | Scan for incoming stealth payments |
| `/stealthpay-withdraw` | Claim and withdraw funds from a stealth address |
| `/stealthpay-help` | Show this help |

## Quick Start
1. `/stealthpay-generate-wallet` — create a wallet
2. Fund it with Sepolia ETH
3. `/stealthpay-setup` — register ENS + stealth keys
4. `/stealthpay-send` — send a private payment

## Security
All private keys are stored in `.env` and handled inside the MCP server (Node.js). They are never exposed to the AI.
