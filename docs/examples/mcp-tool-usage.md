# MCP Tool Usage Examples (Pseudo)

## `resolve_payment_profile`

```json
{
  "tool": "resolve_payment_profile",
  "input": {
    "ens_name": "alice.eth",
    "payment_context": {
      "privacy": "preferred"
    }
  }
}
```

## `build_payment_route`

```json
{
  "tool": "build_payment_route",
  "input": {
    "ens_name": "alice.eth",
    "amount": "50",
    "asset": "USDC",
    "constraints": {
      "allowed_chains": ["base", "ethereum"],
      "gasless": true
    }
  }
}
```

## `create_payment_link`

```json
{
  "tool": "create_payment_link",
  "input": {
    "route_id": "route_123",
    "expires_in_seconds": 900,
    "metadata": {
      "invoice_id": "inv_001"
    }
  }
}
```
