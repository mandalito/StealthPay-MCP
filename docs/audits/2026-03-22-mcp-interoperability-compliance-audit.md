# StealthPay MCP Interoperability Compliance Audit

Date: 2026-03-22  
Repository: `StealthPay-MCP`  
Scope: current codebase under `src/`, `test/`, and current docs.

## Executive Summary

StealthPay MCP is **functionally aligned with the core ERC-5564 stealth flow** (scheme `1`, key derivation flow, announcer usage) and **partially aligned with ERC-6538** (read path only).  
The main interoperability blockers are:

1. **Announcement metadata dialect divergence** from ERC-5564 recommendations (and one MUST for selector inclusion when available).
2. **No ERC-6538 registration write path** in the MCP surface.
3. **Chain-aware registry interoperability gaps** (lookup tied to ENS chain context).
4. **Custom payment link format** instead of ERC-681.

This update assumes an in-development context where **backward compatibility is not required**.

## Method

- Static review of implementation:
  - `src/lib/stealth.ts`
  - `src/lib/payments.ts`
  - `src/lib/scanner.ts`
  - `src/lib/ens.ts`
  - `src/lib/ens-register.ts`
  - `src/tools/*`
- Deterministic verification runs:
  - `npm run build` (pass)
  - `npm run test:unit` (pass, 19/19)
  - `npm run test:tools` (pass, 30/30)
- Standards references reviewed:
  - [ERC-5564](https://eips.ethereum.org/EIPS/eip-5564)
  - [ERC-6538](https://eips.ethereum.org/EIPS/eip-6538)
  - [ERC-137](https://eips.ethereum.org/EIPS/eip-137)
  - [ERC-634](https://eips.ethereum.org/EIPS/eip-634)
  - [ERC-20](https://eips.ethereum.org/EIPS/eip-20)
  - [ERC-681](https://eips.ethereum.org/EIPS/eip-681)
  - [ERC-3770](https://eips.ethereum.org/EIPS/eip-3770)
  - [MCP Tools Spec (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

## Compliance Matrix

| Standard | Status | Notes |
|---|---|---|
| ERC-5564 (Stealth Addresses) | **Partial** | Core scheme-1 cryptography and announcer flow are aligned. Metadata encoding/decoding is project-specific and diverges from ERC-5564 recommendations; selector handling is the main issue. |
| ERC-6538 (Registry) | **Partial** | Read path implemented (`stealthMetaAddressOf`). No MCP write path to `registerKeys` / `registerKeysOnBehalf`. |
| ERC-137 + ERC-634 (ENS + text records) | **Mostly compliant** | Proper normalization/namehash use and text record read/write. Custom keys are not namespaced service keys; forward-compat namespace is not yet active in parser. |
| MCP Tools spec | **Mostly compliant** | Tools are schema-validated and return `content[]` with `isError` handling. Output schemas / structured outputs are not used, reducing machine-to-machine interoperability. |
| ERC-20 | **Compliant baseline** | Uses standard `transfer`, `balanceOf`, `decimals` call patterns. |
| ERC-681 (payment URI) | **Not compliant** | `create-payment-link` uses custom HTTPS query format, not `ethereum:` URI format. |
| ERC-3770 (chain-specific prefixes) | **Partial** | `st:` prefix is supported, but prefix shortName is not validated and generated stealth meta-address is hardcoded to `st:eth:`. |

## Detailed Findings

### 1) ERC-5564 metadata interoperability gap (High)

**What is implemented**

- Announcement includes required fields and first-byte view tag support:
  - `src/lib/payments.ts` (`announce` call + metadata encoding)
  - `src/lib/scanner.ts` (view tag filtering + ownership check)

**Interoperability issue**

- Metadata is encoded as `viewTag + tokenAddress + amount` only (`src/lib/payments.ts`).
- ERC-5564 recommends `viewTag + 4-byte function identifier + token address + amount/tokenId`, and states selector MUST be used when available.
- Scanner decoder assumes this project’s offsets (`src/lib/scanner.ts`) and can misdecode third-party ERC-5564 metadata that follows selector-based layout.

**Impact**

- Cross-project announcement parsing can be incorrect for token and amount fields.
- Discovery still works via viewTag + address check, but decoded metadata is less portable.

### 2) ERC-6538 is read-only in MCP flow (High)

**What is implemented**

- Registry lookup fallback exists:
  - `src/lib/ens.ts` -> `stealthMetaAddressOf(registrant, schemeId)`

**Gap**

- `register-stealth-keys` writes only ENS text record (`setText`), not ERC-6538 registry:
  - `src/lib/ens-register.ts`

**Impact**

- Users registered only through this MCP may be discoverable through ENS text path, but not through the canonical registry path expected by some integrators.

### 3) Registry lookup chain context tied to ENS client (Medium)

**Observation**

- Registry fallback read uses `getEnsClient()` chain context (`src/lib/ens.ts`), which is driven by `ENS_CHAIN`.

**Impact**

- If a recipient registers in ERC-6538 on the payment chain but not on `ENS_CHAIN`, lookup can fail despite valid registry registration elsewhere.

### 4) Stealth meta-address prefix handling is permissive/hardcoded (Medium)

**Observation**

- Parser accepts `st:<chain>:...` but ignores chain shortName semantics (`src/lib/stealth.ts`).
- Generated metadata URI is hardcoded as `st:eth:` (`src/lib/ens-register.ts`), regardless of configured chain.

**Impact**

- Reduced consistency with chain-specific prefix expectations and potential parser mismatches across ecosystems.

### 5) MCP output interoperability is text-first only (Medium)

**Observation**

- Tools return human-readable text blocks only; no `outputSchema`/`structuredContent` currently provided (`src/tools/*`).

**Impact**

- Harder to compose with strict machine clients that rely on typed outputs.

### 6) Payment links are proprietary format (Low/Design)

**Observation**

- `create-payment-link` emits custom `https://...?...` links (`src/lib/payments.ts`, `src/tools/create-payment-link.ts`).

**Impact**

- Links are not directly portable to wallets expecting ERC-681 `ethereum:` URI format.

## Positive Compliance Signals

- Scheme ID is fixed to `1` and used consistently (`src/config.ts`).
- ERC-5564 announcer singleton and ERC-6538 registry singleton addresses match standard deployment addresses (`src/config.ts`).
- Stealth math flow aligns with scheme-1 generation/check/derive model (`src/lib/stealth.ts`).
- Recipient key material stays server-side for scan/claim flows, reducing leakage risk through MCP tool IO (`src/tools/scan-announcements.ts`, `src/tools/claim-stealth-payment.ts`).

## Recommended Remediation Plan (Interoperability-First, No Backward Compatibility)

1. **Replace current metadata codec with strict ERC-5564 selector-aware encoding**
   - Use a single canonical metadata layout aligned with ERC-5564 guidance.
   - Remove project-specific legacy decode assumptions from scanner paths.

2. **Promote ERC-6538 write path to first-class behavior**
   - Extend `register-stealth-keys` to write to registry (`registerKeys` and/or `registerKeysOnBehalf` workflows).
   - Treat ENS text record as optional mirror metadata, not the canonical source.

3. **Use payment-chain context as source of truth for registry lookup**
   - Resolve registry on the active transaction/payment chain.
   - Remove lookup behavior that depends only on `ENS_CHAIN`.

4. **Enforce strict stealth meta-address prefix semantics**
   - Validate `st:<shortName>:` against target chain short name rules.
   - Stop generating hardcoded `st:eth:` values.

5. **Move core MCP tools to typed outputs now**
   - Add `outputSchema` + `structuredContent` as the primary contract for:
     - `get-payment-profile`
     - `generate-stealth-address`
     - `scan-announcements`
     - `send-stealth-payment`
     - `claim-stealth-payment`

6. **Align payment request links to ERC-681**
   - Replace proprietary link generation with `ethereum:` URI output for interoperable wallet handling.
   - Keep custom web URL format only if it is explicitly outside the interoperability-critical path.

## Conclusion

Current implementation is a strong **functional stealth-payment MVP** with solid core cryptographic alignment.  
To achieve the interoperability goal, priority should go to **strict ERC-5564 metadata conformance** and **ERC-6538 write-path support**, then typed MCP outputs for machine clients.
