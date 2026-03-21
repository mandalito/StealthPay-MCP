Send a stealth payment.

Use the stealthpay MCP tools to send a private payment:

1. First use `get-balances` to check what the user has available on the target chain.
2. Use `get-payment-profile` to look up the recipient and verify they have stealth keys registered.
3. Use `send-stealth-payment` to send the payment.

Supports: native ETH, stablecoin symbols (USDC, USDT, DAI), or any ERC-20 by 0x contract address.

If the recipient has no stealth meta-address, inform the user and suggest they ask the recipient to register stealth keys first.

Arguments: $ARGUMENTS
Parse the arguments for: recipient ENS name, amount, token (default ETH), chain (default sepolia).
Example: "/stealthpay-send 0.01 ETH to alice.eth on sepolia"
