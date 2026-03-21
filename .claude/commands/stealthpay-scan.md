Scan for incoming stealth payments.

Use the stealthpay `scan-announcements` MCP tool. The tool reads keys from environment variables by default — no need to paste keys in chat.

If RECIPIENT_VIEWING_PRIVATE_KEY and RECIPIENT_SPENDING_PUBLIC_KEY are set in .env, just ask:
- Chain to scan (default: base)
- Optional: block range

If keys are NOT configured, tell the user to add them to their .env file:
```
RECIPIENT_VIEWING_PRIVATE_KEY=0x...
RECIPIENT_SPENDING_PUBLIC_KEY=0x...
```
Then restart the MCP server with /mcp.

NEVER ask the user to paste private keys in chat.

Arguments: $ARGUMENTS
