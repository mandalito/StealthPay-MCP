# Dependency Evaluation (ENS MCP / Umbra)

## Scope

This note summarizes whether StealthPay MCP should depend on:

- ENS MCP Server (`justaname-id/ens-mcp-server`)
- Umbra protocol (`ScopeLift/umbra-protocol`)

## ENS MCP Server

Observed characteristics:

- focused on ENS read/query operations
- no ENS name registration flow
- mainnet-oriented behavior
- heavier dependency stack (`@ensdomains/ensjs`, `ethers`, additional SDKs)

StealthPay implications:

- StealthPay needs registration + key setup flows on Sepolia for hackathon usage
- current implementation already covers required ENS operations with `viem`
- adding ENS MCP as a hard dependency increases complexity for limited MVP benefit

Decision:

- **Do not use ENS MCP as a core dependency for MVP**
- optional companion usage is reasonable for advanced ENS queries outside core payment flows

## Umbra Protocol

Observed characteristics:

- mature production protocol and app
- useful operational features (batch send, relayer patterns, subgraph-assisted scanning)
- protocol design differs from StealthPay's ERC-5564/6538 direction

StealthPay implications:

- StealthPay is scoped around ERC-5564 announcements + ERC-6538 meta-address conventions
- direct dependency replacement with Umbra stack would move away from current standards target

Decision:

- **Do not replace StealthPay core with Umbra SDK for MVP**
- reuse architectural ideas as future enhancements (batch flows, indexing/scanning acceleration, relayer UX)

## Current Dependency Stack

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server framework |
| `@noble/secp256k1` | Elliptic curve math (stealth addresses, ECDH) |
| `@noble/hashes` | Hashing (HKDF-SHA256 for key derivation, keccak256 peer dep) |
| `@noble/ciphers` | Symmetric encryption (ChaCha20-Poly1305 for encrypted notes) |
| `viem` | ENS resolution, transactions, contract calls, keccak256 |
| `zod` | Input schema validation |
| `dotenv` | Environment variable loading |

## MVP Guidance

For the hackathon:

1. Keep StealthPay core implementation standards-aligned with ERC-5564/6538.
2. Keep ENS integration lightweight and Sepolia-capable.
3. Treat ENS MCP/Umbra as inspiration or optional ecosystem companions, not mandatory runtime dependencies.
