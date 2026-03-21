# MCP Tool Usage Examples (Current)

## `register-ens-name`

```json
{
  "tool": "register-ens-name",
  "input": {
    "label": "stealthpaydemo123",
    "chain": "sepolia",
    "years": 1
  }
}
```

## `register-stealth-keys`

```json
{
  "tool": "register-stealth-keys",
  "input": {
    "name": "stealthpaydemo123.eth",
    "chain": "sepolia"
  }
}
```

## `get-payment-profile`

```json
{
  "tool": "get-payment-profile",
  "input": {
    "name": "alice.eth"
  }
}
```

## `send-stealth-payment`

```json
{
  "tool": "send-stealth-payment",
  "input": {
    "to": "alice.eth",
    "amount": "50",
    "token": "USDC",
    "chain": "base"
  }
}
```

## `scan-announcements`

```json
{
  "tool": "scan-announcements",
  "input": {
    "chain": "sepolia"
  }
}
```

Notes:

- `scan-announcements` reads `RECIPIENT_VIEWING_PRIVATE_KEY` and `RECIPIENT_SPENDING_PUBLIC_KEY` from `.env`.
- No private key inputs are accepted in this tool schema.

## `claim-stealth-payment`

```json
{
  "tool": "claim-stealth-payment",
  "input": {
    "ephemeralPublicKey": "0x02...",
    "to": "0xabc...",
    "token": "ETH",
    "chain": "sepolia"
  }
}
```

Notes:

- `claim-stealth-payment` uses recipient keys from local `.env`.
- Derivation + withdrawal happen server-side; private keys are not returned in tool output.
