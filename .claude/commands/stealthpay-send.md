Send a stealth payment.

Use the stealthpay MCP tools to send a private payment:

1. First check if a wallet is set. If not, ask the user to provide one and use `set-wallet`.
2. Use `get-payment-profile` to look up the recipient and verify they have stealth keys registered.
3. Use `send-stealth-payment` to send the payment.

If the recipient has no stealth meta-address, inform the user and suggest they ask the recipient to register stealth keys first.

Arguments: $ARGUMENTS
Parse the arguments for: recipient ENS name, amount, token (default USDC), chain (default base).
Example: "/send 50 USDC to alice.eth on base"
