Show all available StealthPay commands and tools.

Display this help overview:

## StealthPay Commands

| Command | Description |
|---------|-------------|
| `/stealthpay-generate-wallet` | Generate a new wallet (key saved to .env, never exposed to AI) |
| `/stealthpay-setup` | Full onboarding: wallet check, ENS registration, stealth keys + preferences |
| `/stealthpay-me` | Show your wallet address, ENS name, and stealth payment profile |
| `/stealthpay-set-profile` | Set your payment preferences (preferred chain, token, description) |
| `/stealthpay-balances` | Check your ETH and token balances on any chain |
| `/stealthpay-profile <name.eth>` | Look up anyone's payment profile and preferences |
| `/stealthpay-send` | Send a stealth payment — respects recipient's preferred chain/token |
| `/stealthpay-scan` | Scan for incoming stealth payments |
| `/stealthpay-withdraw` | Claim and withdraw funds from a stealth address |
| `/stealthpay-help` | Show this help |

## Quick Start
1. `/stealthpay-generate-wallet` — create a wallet
2. Fund it with Sepolia ETH
3. `/stealthpay-setup` — register ENS + stealth keys + preferences
4. `/stealthpay-balances` — check what you have
5. `/stealthpay-send` — send a private payment

## Supported Tokens
- **ETH** — native Ether
- **USDC, USDT, DAI** — by symbol (on chains where configured)
- **Any ERC-20** — by 0x contract address

## Security
All private keys are stored in `.env` and handled inside the MCP server (Node.js). They are never exposed to the AI.
