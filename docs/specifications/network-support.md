# Network Support Status (Hackathon)

## Decision Summary

Hoodi is currently not confirmed as a supported target for the chosen dependencies.

For hackathon delivery, Sepolia is the safest testnet baseline.

## Umbra Protocol SDK Status

Checked from the local clone of `ScopeLift/umbra-protocol`:

- no `hoodi` references found in repository source/config
- network config/deployment parameters include `sepolia`, `mainnet`, `base`, `optimism`, `arbitrum` (and some others), but not `hoodi`

Local references:

- `.local/umbra-protocol/contracts-core/hardhat.config.ts`
- `.local/umbra-protocol/contracts-core/scripts/deployParams.json`
- `.local/umbra-protocol/contracts-core/scripts/deployParams-registry.json`

## ENS Status

Checked from official ENS deployment references and local `ens-contracts` clone:

- official deployment matrix lists mainnet, sepolia, holesky (no hoodi entry)
- local `ens-contracts` deployment folders include `sepolia` and `holesky`, but no `hoodi` folder

Local references:

- `.local/ens-contracts/deployments/`
- `.local/ens-contracts/hardhat.config.ts`

## Practical Implication

If the team keeps Hoodi as mandatory, additional work is required:

- deploy and maintain Umbra-compatible contracts on Hoodi
- deploy/confirm ENS registry + resolver stack on Hoodi
- reconfigure ENS MCP and EVM MCP for Hoodi chain metadata

For hackathon reliability, use Sepolia for end-to-end demo unless Hoodi deployments are completed first.
