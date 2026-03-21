# Network Support Status (Hackathon)

## Hackathon Decision

Sepolia is the official testnet for hackathon development and demos.

## Current Code-Level Support

### ENS registration tools

- supported chains: `sepolia`, `ethereum` (via `ENS_CONTRACTS`)
- default for registration tools: `sepolia`

### ENS resolution

- defaults to mainnet
- can be switched via `ENS_CHAIN=sepolia`

### `send-stealth-payment` token routing

Stablecoin send is currently configured for:

- `ethereum`, `base`, `optimism`, `arbitrum`, `polygon`, `gnosis`

Not currently configured in `STABLECOINS`:

- `sepolia`
- `hoodi`

### Recipient scanning/derivation

- works on any chain where announcer contract + RPC are reachable
- tested scripts target Sepolia

## Hoodi Status

Hoodi remains experimental in this codebase:

- chain is listed in `SUPPORTED_CHAINS`
- contracts/token support is not complete for the full payment flow
