Set up StealthPay: register an ENS name with stealth keys and payment preferences.

Walk the user through onboarding:

1. **Check profile**: Use `get-my-profile` to show the user their address and any existing ENS names. If SENDER_PRIVATE_KEY is not set, tell them to add it to their .env file and restart with /mcp. NEVER ask the user to paste their private key in chat.
2. Ask if they want to register a new ENS name or use an existing one.
   - If new: use `register-ens-name` (warn about the ~65s commitment wait).
   - If existing: skip to step 3.
3. Use `register-stealth-keys` to generate and register stealth keys on their ENS name.
4. **Set payment preferences**: Ask the user for their preferred chain (e.g., sepolia, base) and token (e.g., ETH, USDC). Use `set-profile` to save these on-chain. These will be used as defaults when others send them payments.
5. Show a final summary of their setup including preferences.

Arguments: $ARGUMENTS
