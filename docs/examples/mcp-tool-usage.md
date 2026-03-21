# MCP Tool Usage Examples (Pseudo)

## `get-payment-preferences`

```json
{
  "tool": "get-payment-preferences",
  "input": {
    "name": "alice.eth"
  }
}
```

## `get-stealth-meta-address`

```json
{
  "tool": "get-stealth-meta-address",
  "input": {
    "name": "alice.eth"
  }
}
```

## `generate-stealth-address`

```json
{
  "tool": "generate-stealth-address",
  "input": {
    "name": "alice.eth",
    "chain_id": 8453,
    "token": "USDC"
  }
}
```

## `send-stealth-payment`

```json
{
  "tool": "send-stealth-payment",
  "input": {
    "name": "alice.eth",
    "amount": "50",
    "token": "USDC",
    "chain_id": 8453,
    "execution_mode": "execute"
  }
}
```

## `send-stealth-payment` (unsigned payload mode)

```json
{
  "tool": "send-stealth-payment",
  "input": {
    "name": "alice.eth",
    "amount": "50",
    "token": "USDC",
    "chain_id": 8453,
    "execution_mode": "build_unsigned_tx"
  }
}
```

## `scan-received-payments`

```json
{
  "tool": "scan-received-payments",
  "input": {
    "keys": {
      "viewing_key": "0x..."
    },
    "chain_ids": [1, 8453, 10, 42161]
  }
}
```

## `create-payment-link`

```json
{
  "tool": "create-payment-link",
  "input": {
    "name": "alice.eth",
    "amount": "50",
    "token": "USDC",
    "chain_id": 8453,
    "expires_at": "2026-03-22T12:00:00Z"
  }
}
```
