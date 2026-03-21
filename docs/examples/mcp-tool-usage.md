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
    "viewingPrivateKey": "0x...",
    "spendingPublicKey": "0x...",
    "chain": "sepolia"
  }
}
```

## `derive-stealth-key`

```json
{
  "tool": "derive-stealth-key",
  "input": {
    "spendingPrivateKey": "0x...",
    "viewingPrivateKey": "0x...",
    "ephemeralPublicKey": "0x..."
  }
}
```

## `withdraw-from-stealth`

```json
{
  "tool": "withdraw-from-stealth",
  "input": {
    "stealthPrivateKey": "0x...",
    "to": "0xabc...",
    "token": "ETH",
    "chain": "sepolia"
  }
}
```
