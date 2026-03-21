# Quick Examples

## Example 1: Basic ENS Resolution

Input:

- ENS: `alice.eth`
- Amount: `50`
- Asset hint: `USDC`

Expected outcome:

- MCP resolves profile
- suggests preferred chain/token route
- includes privacy mode metadata

## Example 2: Privacy-Required Payment

Input:

- ENS: `privacyuser.eth`
- Privacy requirement: `stealth_required`

Expected outcome:

- route uses stealth-compatible receiver target
- if unavailable, returns `STEALTH_UNAVAILABLE`

## Example 3: Fallback Routing

Input:

- preferred asset unavailable on preferred chain

Expected outcome:

- route builder returns alternative route list
- top route includes rationale fields
