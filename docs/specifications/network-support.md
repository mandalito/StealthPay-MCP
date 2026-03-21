# Network Support Status (Hackathon)

## Hackathon Decision

Sepolia is the official testnet for hackathon development and demos.

## Requirements by Feature

### ENS onboarding and profile resolution

- ENS registration/write tools use `ENS_CONTRACTS` and currently support:
  - `sepolia`
  - `ethereum`
- ENS resolution defaults to mainnet and can be switched with `ENS_CHAIN=sepolia`.

### Stealth payment primitives

- payment/scan/claim flows require:
  - ERC-5564 announcer deployment
  - ERC-6538 registry deployment
  - reachable chain RPC

## Live Deployment Check (2026-03-21)

Configured singleton addresses:

- announcer: `0x55649E01B5Df198D18D95b5cc5051630cfD45564`
- registry: `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`

Result (`eth_getCode`):

| Chain | Announcer | Registry |
|------|-----------|----------|
| ethereum | deployed | deployed |
| base | deployed | deployed |
| optimism | deployed | deployed |
| arbitrum | deployed | deployed |
| polygon | deployed | deployed |
| gnosis | deployed | deployed |
| sepolia | deployed | deployed |
| hoodi | not deployed | not deployed |

## Token Routing (`send-stealth-payment`)

Stablecoin symbol mapping in `STABLECOINS` is configured for:

- `ethereum`, `base`, `optimism`, `arbitrum`, `polygon`, `gnosis`

Not configured by symbol map:

- `sepolia`
- `hoodi`

Notes:

- `ETH` (native) and explicit ERC-20 contract addresses can still be used.
- For hackathon demos, Sepolia with native ETH is the baseline.
