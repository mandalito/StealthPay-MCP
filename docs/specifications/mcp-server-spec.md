# MCP Server Specification (Current Implementation)

## Registered Tools

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
- returns generated key material in tool output

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
- sends ERC-20 transfer
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

- `viewingPrivateKey`
- `spendingPublicKey`
- `chain` (optional)
- `fromBlock` (optional)
- `toBlock` (optional)

Behavior:

- scans ERC-5564 `Announcement` events
- filters by view tag + full stealth address check

#### `derive-stealth-key`

Input:

- `spendingPrivateKey`
- `viewingPrivateKey`
- `ephemeralPublicKey`
- `expectedAddress` (optional)

Behavior:

- derives stealth private key and address
- optionally verifies against expected address

#### `withdraw-from-stealth`

Input:

- `stealthPrivateKey`
- `to`
- `token` (`ETH` or ERC-20 address)
- `amount` (optional)
- `chain` (optional)

Behavior:

- sends ETH or ERC-20 transfer from stealth address
- requires ETH on stealth address to pay gas

## Response Format

Current tools return human-readable text blocks via MCP `content[]`.

## Error Model (Current)

Errors are returned as text with `isError=true`.
Most errors are runtime validation or RPC/contract call failures.
