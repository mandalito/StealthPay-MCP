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

Re-check command:

- `npm run check:deployments`

## Token Routing (`send-stealth-payment`)

Stablecoin symbol mapping in `STABLECOINS` is configured for:

- `ethereum` (USDC, USDT, DAI)
- `base` (USDC, DAI)
- `optimism` (USDC, USDT, DAI)
- `arbitrum` (USDC, USDT, DAI)
- `polygon` (USDC, USDT, DAI)
- `gnosis` (USDC, WXDAI)
- `sepolia` (USDC, DAI, USDT)

Not configured by symbol map:

- `hoodi`

Notes:

- `ETH` (native) and explicit ERC-20 contract addresses can still be used on any chain.
- For hackathon demos, Sepolia with native ETH or testnet stablecoins is the baseline.

## Hoodi Decision (2026-03-21)

`hoodi` remains in `SUPPORTED_CHAINS` for forward compatibility and read-path experimentation, but is not considered operational for stealth payment flows until singleton contracts are deployed.
