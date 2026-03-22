# MCP Server Specification (Current Implementation)

## Registered Tools (12)

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

### Onboarding & Profile

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

#### `set-profile`

Input:

- `name` (string, full ENS name)
- `chain` (optional, friendly name or CAIP-2)
- `token` (optional, symbol or CAIP-19)
- `description` (optional)
- `stealthPolicy` (optional, enum: `required | preferred | optional | disabled`)
- `notePolicy` (optional, enum: `required | optional | none`)
- `noteMaxBytes` (optional, number)
- `notePrivacy` (optional, enum: `plaintext | encrypted | hash_only`)
- `ensChain` (default `sepolia`)

Behavior:

- dual-writes both `stealthpay.v1.*` namespaced keys (CAIP-normalized) and legacy keys
- automatically sets `stealthpay.v1.profile_version = "1"` when any v1 key is written
- blocked from modifying policy fields when `POLICY_IMMUTABLE=true`
- uses `SENDER_PRIVATE_KEY`

### Sender

#### `get-payment-profile`

Input:

- `name` (string)

Output fields (logical):

- ENS address, avatar, description
- CAIP-2 preferred chains, CAIP-19 preferred assets (+ legacy friendly names)
- stealth meta-address, stealth policy, stealth scheme IDs
- note policy, note max bytes, note privacy

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
- `token` (string, optional — defaults to recipient preference or ETH)
- `chain` (string, optional — defaults to recipient preference or `DEFAULT_CHAIN`)
- `memo` (string, optional — payment note, subject to recipient note policy)

Behavior:

- resolves stealth meta-address and payment profile
- enforces recipient stealth policy (`disabled` → reject)
- enforces recipient note policy (`required` / `none` / max bytes)
- enforces agent spend policy (per-tx cap, daily limit, allowlists)
- encrypts memo if recipient `notePrivacy` is `encrypted` or stores hash if `hash_only`
- generates one-time stealth address
- sends ETH or ERC-20 transfer
- announces through ERC-5564 announcer
- records spend amount for daily limit tracking

Note:

- current implementation executes directly (no unsigned-tx mode)

#### `create-payment-link`

Input:

- `to` (string)
- `amount` (optional)
- `token` (optional)
- `chain` (optional)
- `memo` (optional)

Output:

- `webUrl` — custom HTTPS link
- `erc681Uri` — ERC-681 `ethereum:` URI (for `.eth` recipients)

### Recipient

#### `scan-announcements`

Input:

- `chain` (optional)
- `fromBlock` (optional)
- `toBlock` (optional)

Behavior:

- scans ERC-5564 `Announcement` events
- filters by view tag + full stealth address check
- decodes memo from announcement metadata (plaintext UTF-8)
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

- enforces agent spend policy (destination allowlist, chain check)
- derives stealth private key server-side using env recipient keys
- withdraws ETH or ERC-20 from stealth address to destination
- records spend amount for daily limit tracking
- requires ETH on stealth address to pay gas

## Environment Variables

### Required

- `SENDER_PRIVATE_KEY` — wallet key for sending payments / registering ENS names

### Optional — RPC & ENS

- `RPC_URL` — custom RPC endpoint for payment chain
- `ENS_RPC_URL` — custom RPC for ENS resolution
- `ENS_CHAIN` — ENS resolution chain (default: mainnet)
- `CHAIN` — payment chain (default: sepolia)

### Optional — Recipient keys

- `RECIPIENT_SPENDING_PRIVATE_KEY`
- `RECIPIENT_SPENDING_PUBLIC_KEY`
- `RECIPIENT_VIEWING_PRIVATE_KEY`
- `RECIPIENT_VIEWING_PUBLIC_KEY`

### Optional — Agent spend policy

- `POLICY_MAX_PER_TX` — per-transaction cap in ETH (default: 0.1)
- `POLICY_MAX_DAILY_SPEND` — rolling 24h limit in ETH (default: 1.0)
- `POLICY_CHAIN_ALLOWLIST` — comma-separated allowed chains
- `POLICY_TOKEN_ALLOWLIST` — comma-separated allowed tokens
- `POLICY_DESTINATION_ALLOWLIST` — comma-separated allowed destinations
- `POLICY_ADMIN_ADDRESS` — admin key for signed policy updates
- `POLICY_IMMUTABLE` — if `true`, blocks agent from modifying policy fields
- `POLICY_VERSION` — policy schema version for rollback protection
- `POLICY_EFFECTIVE_AT` — ISO 8601 effective timestamp

## Response Format

Tools return human-readable text blocks via MCP `content[]` and structured data via `structuredContent` where applicable.

## Error Model (Current)

Errors are returned as text with `isError=true`.
Most errors are runtime validation, policy violations, or RPC/contract call failures.
