# Agentic Payment Flow (Current)

## Onboarding Flow

1. Call `register-ens-name` (optional if user already owns ENS name).
2. Call `register-stealth-keys` to write stealth metadata.
3. Optionally call `set-profile` to set payment preferences (chain, token, stealth policy, note policy).

## Sender Flow

1. Call `get-payment-profile(name)` — resolves ENS, reads CAIP-normalized preferences and stealth/note policies.
2. Call `generate-stealth-address(name)` — generates a one-time stealth address.
3. Call `send-stealth-payment(to, amount, token?, chain?, memo?)`:
   - **Policy enforcement**: validates recipient stealth policy (`disabled` → rejected).
   - **Note enforcement**: validates memo against recipient note policy (`required` / `none` / max bytes).
   - **Spend policy**: checks agent limits (per-tx cap, daily spend, chain/token/destination allowlists).
   - **Note encryption**: if recipient `notePrivacy` is `encrypted`, encrypts memo with recipient viewing key (ChaCha20-Poly1305). If `hash_only`, stores keccak256 hash.
   - Sends transfer + announces via ERC-5564.
   - Records spend amount for daily limit tracking.
4. Optionally call `create-payment-link(...)` for sharing (returns web URL + ERC-681 URI).

## Recipient Flow

1. Call `scan-announcements(chain, fromBlock?, toBlock?)` — discovers payments, decodes memos.
2. For each match, call `claim-stealth-payment(ephemeralPublicKey, to, token, amount?, chain?)`:
   - **Spend policy**: checks destination against allowlists.
   - Derives stealth private key + withdraws server-side.
3. Funds are transferred without exposing recipient private keys in MCP inputs/outputs.

## Hackathon Testnet

Use Sepolia for end-to-end hackathon tests.
