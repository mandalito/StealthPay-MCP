# Quick Examples

## Example 1: Get Preferences

Input:

- tool: `get-payment-preferences`
- `name`: `alice.eth`

Expected outcome:

- preferred chains/tokens returned from ENS-derived records
- privacy mode returned for route logic

## Example 2: Generate Stealth Address

Input:

- tool: `generate-stealth-address`
- `name`: `alice.eth`
- `chain_id`: `8453` (Base)
- `token`: `USDC`

Expected outcome:

- stealth destination returned
- includes metadata needed for announcement/recovery compatibility

## Example 3: Send Payment

Input:

- tool: `send-stealth-payment`
- params for `alice.eth`, `50` `USDC`, chain Base

Expected outcome:

- payment routed using derived stealth destination
- transaction executed via EVM MCP
- tx hash and status returned
