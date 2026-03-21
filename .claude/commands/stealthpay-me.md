Show my StealthPay profile.

Use the stealthpay `get-my-profile` MCP tool. It will show:
- Your wallet address (derived from SENDER_PRIVATE_KEY — key is never exposed)
- Your ENS name (reverse-resolved from address)
- Your payment profile (avatar, description, stealth meta-address)
- Whether your recipient keys are configured for scanning

No arguments needed — everything comes from environment variables.
