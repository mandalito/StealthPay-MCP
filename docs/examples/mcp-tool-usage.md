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

## `set-profile`

```json
{
  "tool": "set-profile",
  "input": {
    "name": "stealthpaydemo123.eth",
    "chain": "base",
    "token": "USDC",
    "stealthPolicy": "preferred",
    "notePolicy": "optional",
    "noteMaxBytes": 280,
    "notePrivacy": "encrypted"
  }
}
```

Notes:

- `chain` accepts friendly names (`"base"`) or CAIP-2 IDs (`"eip155:8453"`).
- `token` accepts symbols (`"USDC"`) or CAIP-19 IDs (`"eip155:8453/erc20:0x833..."`).
- Writes both `stealthpay.v1.*` namespaced keys and legacy keys for compatibility.
- Blocked when `POLICY_IMMUTABLE=true` for policy fields (`stealthPolicy`, `notePolicy`, `noteMaxBytes`, `notePrivacy`).

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
    "chain": "base",
    "memo": "March invoice payment"
  }
}
```

Notes:

- `token` defaults to the recipient's preferred token, then ETH if unset.
- `chain` defaults to the recipient's preferred chain, then `DEFAULT_CHAIN` (sepolia).
- `memo` is optional; subject to recipient's note policy and max bytes.
- If recipient `notePrivacy` is `encrypted`, the memo is encrypted with their viewing key.
- Transaction is checked against the agent spend policy before execution.

## `create-payment-link`

```json
{
  "tool": "create-payment-link",
  "input": {
    "to": "alice.eth",
    "amount": "50",
    "token": "USDC",
    "chain": "base",
    "memo": "Coffee meetup"
  }
}
```

Returns both a web URL and an ERC-681 `ethereum:` URI (for `.eth` recipients).

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
- Transaction is checked against the agent spend policy (destination allowlist).
