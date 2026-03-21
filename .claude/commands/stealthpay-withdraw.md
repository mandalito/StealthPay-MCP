Claim and withdraw funds from a stealth payment.

Use the stealthpay `claim-stealth-payment` MCP tool. This tool derives the stealth private key AND withdraws in one step — no private keys ever pass through AI.

The tool reads RECIPIENT_SPENDING_PRIVATE_KEY and RECIPIENT_VIEWING_PRIVATE_KEY from .env automatically.

Ask the user for:
- Ephemeral public key (from /stealthpay-scan output)
- Destination address
- Token (ETH or contract address)
- Chain (default: base)
- Amount (optional — omit for full balance)

If recipient keys are not configured, tell the user to run /stealthpay-setup first.

Warn that the stealth address needs ETH for gas.

NEVER ask the user to paste private keys in chat.

Arguments: $ARGUMENTS
