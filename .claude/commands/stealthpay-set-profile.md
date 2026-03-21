Set your payment profile preferences.

Use the stealthpay `set-profile` MCP tool to update your ENS text records.

Ask the user which preferences they want to set:
- **Preferred chain** (e.g., sepolia, base, ethereum) — where they want to receive payments
- **Preferred token** (e.g., ETH, USDC) — what token they prefer
- **Description** — a short profile description

These preferences are visible to anyone looking up your profile, and `send-stealth-payment` will use them as defaults when someone sends you a payment.

Arguments: $ARGUMENTS
Example: "/stealthpay-set-profile chain=sepolia token=ETH on stealthpay.eth"
