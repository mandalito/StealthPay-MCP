# Gasless Payment Flow (Draft)

## Goal

Document a potential sponsored/gasless execution path.

## Baseline Sequence

1. Agent requests route with gasless preference enabled.
2. MCP returns compatible route and sponsor requirements.
3. Integrator obtains quote/approval from sponsor or relayer.
4. User/agent signs intent payload.
5. Relayer submits transaction.
6. Execution status and receipt are returned.

## Required Interfaces (Draft)

- quote endpoint
- sponsor policy checker
- signed intent schema
- status polling or callback

## Open Questions

- [TODO] Which gasless stack is used in the hackathon build.
- [TODO] Who pays sponsorship costs and under what limits.
- [TODO] Whether gasless is fallback or first-class route.
