# Privacy and Stealth Addresses

## Motivation

Receiving repeated payments on one public address creates linkability and correlation risk.

## Hackathon Approach

StealthPay MCP uses Umbra Protocol SDK primitives rather than implementing stealth logic from scratch.

## Privacy Path

1. resolve stealth metadata for recipient identity
2. derive unique stealth destination for payment context
3. execute payment on chosen network
4. receiver scans and recovers with compatible keys

## Interfaces in Scope

- ERC-5564 announcer
- ERC-6538 registry
- ENS text records
- networks: Ethereum, Base, OP, Arbitrum

## Threats Addressed

- address reuse correlation
- simple payer->recipient graph linkage

## Threats Not Fully Addressed

- transport-level metadata leakage
- relayer/operator metadata leakage
- full adversarial traffic analysis

## Requirements

- deterministic and testable integration with Umbra SDK
- graceful fallback when stealth metadata is missing
- explicit tool-level error when `stealth_required` cannot be satisfied
