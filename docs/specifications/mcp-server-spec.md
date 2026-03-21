# MCP Server Specification (Current Implementation)

## Registered Tools

### Identity

#### `get-my-profile`

Behavior:

- reads sender wallet context from env
- reports wallet, ENS profile context, and recipient-key configuration status

#### `generate-wallet`

Behavior:

- generates a new local wallet
- writes `SENDER_PRIVATE_KEY` to local `.env` when not already set
- returns address only (no private key in output)

#### `get-balances`

Input:

- `chain` (optional, defaults to `DEFAULT_CHAIN`)

Behavior:

- shows native/token balances for sender wallet on selected chain

### Onboarding

#### `register-ens-name`

Input:

- `label` (string)
- `chain` (string, default `sepolia`, supported by `ENS_CONTRACTS`)
- `years` (number, default `1`)

Behavior:

- commit -> wait -> register flow via ENS controller
- uses `SENDER_PRIVATE_KEY`

#### `register-stealth-keys`

Input:

- `name` (string, full ENS name)
- `chain` (string, default `sepolia`)

Behavior:

- generates spending/viewing keypairs
- writes ENS text record key `stealth-meta-address`
- stores generated recipient keys in local `.env`
- does not return private keys in tool output

### Sender

#### `get-payment-profile`

Input:

- `name` (string)

Output fields (logical):

- ENS address, avatar, preferred chain/token, stealth meta-address, description

#### `generate-stealth-address`

Input:

- `name` (string)

Output fields (logical):

- stealth address
- ephemeral public key
- view tag

#### `send-stealth-payment`

Input:

- `to` (ENS name)
- `amount` (string)
- `token` (string, default `USDC`)
- `chain` (string, default from `DEFAULT_CHAIN`)

Behavior:

- resolves stealth meta-address
- generates one-time stealth address
- sends ETH or ERC-20 transfer
- announces through ERC-5564 announcer

Note:

- current implementation executes directly (no unsigned-tx mode)

#### `create-payment-link`

Input:

- `to` (string)
- `amount` (optional)
- `token` (optional)
- `chain` (optional)
- `memo` (optional)

Behavior:

- builds URL with query params

### Recipient

#### `scan-announcements`

Input:

- `chain` (optional)
- `fromBlock` (optional)
- `toBlock` (optional)

Behavior:

- scans ERC-5564 `Announcement` events
- filters by view tag + full stealth address check
- reads recipient keys from environment only:
  - `RECIPIENT_VIEWING_PRIVATE_KEY`
  - `RECIPIENT_SPENDING_PUBLIC_KEY`

#### `claim-stealth-payment`

Input:

- `ephemeralPublicKey`
- `to`
- `token` (`ETH` or ERC-20 address)
- `amount` (optional)
- `chain` (optional)

Behavior:

- derives stealth private key server-side using env recipient keys
- withdraws ETH or ERC-20 from stealth address to destination
- requires ETH on stealth address to pay gas

## Response Format

Current tools return human-readable text blocks via MCP `content[]`.

## Error Model (Current)

Errors are returned as text with `isError=true`.
Most errors are runtime validation or RPC/contract call failures.
