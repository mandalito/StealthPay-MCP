Generate a new wallet for StealthPay.

Use the stealthpay `generate-wallet` MCP tool. It will:
- Generate a new private key (stays in Node.js, never exposed to AI)
- Save it to .env automatically
- Return only the address

If a wallet already exists, it will show the current address and refuse to overwrite.

NEVER ask the user for a private key. The tool handles everything securely.

After generating, remind the user to fund the address with testnet ETH (Sepolia) to start using StealthPay.
