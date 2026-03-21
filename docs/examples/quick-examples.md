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
- `execution_mode`: `execute` (or `build_unsigned_tx`)

Expected outcome:

- payment routed using derived stealth destination
- if `execute`: transaction executed via EVM MCP with tx hash/status
- if `build_unsigned_tx`: unsigned payload returned for external signing/broadcast
