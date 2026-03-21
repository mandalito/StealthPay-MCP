Set up StealthPay: register an ENS name with stealth keys.

Walk the user through onboarding:

1. **Check profile**: Use `get-my-profile` to show the user their address and any existing ENS names. If SENDER_PRIVATE_KEY is not set, tell them to add it to their .env file and restart with /mcp. NEVER ask the user to paste their private key in chat.
2. Ask if they want to register a new ENS name or use an existing one.
   - If new: use `register-ens-name` (warn about the ~65s commitment wait).
   - If existing: skip to step 3.
3. Use `register-stealth-keys` to generate and register stealth keys on their ENS name.
4. **Important**: Tell the user to save the stealth keys output to their .env file:
   ```
   RECIPIENT_SPENDING_PRIVATE_KEY=0x...
   RECIPIENT_SPENDING_PUBLIC_KEY=0x...
   RECIPIENT_VIEWING_PRIVATE_KEY=0x...
   ```
   This allows /scan and /withdraw to work without exposing keys to AI.
5. Show a final summary of their setup.

Arguments: $ARGUMENTS
