/**
 * Agent spend policy engine.
 *
 * Provides MCP-native policy controls for transaction execution:
 * - Per-transaction caps
 * - Daily spend limits
 * - Token / chain allowlists
 * - Destination allowlists
 *
 * Policy is loaded from environment or a signed policy file.
 * The agent runtime (MCP tool path) can only READ policy — never modify it.
 * Policy mutations require a signed policy artifact verified by a pinned admin key.
 */

import { verifyMessage } from 'viem';

// ── Policy Types ──────────────────────────────────────────────────────────

export interface SpendPolicy {
  /** Schema version — for rollback protection */
  version: number;
  /** ISO 8601 timestamp when this policy becomes effective */
  effectiveAt: string;
  /** Per-transaction cap in ETH (applies to native + token value) */
  maxPerTx: number;
  /** Rolling 24h spend limit in ETH */
  maxDailySpend: number;
  /** Allowed chains (friendly names). Empty = all allowed. */
  chainAllowlist: string[];
  /** Allowed token symbols or addresses. Empty = all allowed. */
  tokenAllowlist: string[];
  /** Allowed destination addresses or ENS names. Empty = all allowed. */
  destinationAllowlist: string[];
}

export interface SignedPolicy {
  policy: SpendPolicy;
  /** Hex-encoded signature from the policy admin */
  signature: `0x${string}`;
}

export interface PolicyViolation {
  rule: string;
  message: string;
}

// ── Spend Ledger (in-memory rolling window) ───────────────────────────────

interface SpendEntry {
  timestamp: number;
  amountEth: number;
}

const spendLedger: SpendEntry[] = [];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function pruneOldEntries(): void {
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  while (spendLedger.length > 0 && spendLedger[0].timestamp < cutoff) {
    spendLedger.shift();
  }
}

function getDailySpendTotal(): number {
  pruneOldEntries();
  return spendLedger.reduce((sum, e) => sum + e.amountEth, 0);
}

export function recordSpend(amountEth: number): void {
  spendLedger.push({ timestamp: Date.now(), amountEth });
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export interface PolicyAuditEntry {
  timestamp: string;
  event: 'policy_loaded' | 'policy_update_accepted' | 'policy_update_rejected' | 'policy_check_passed' | 'policy_check_failed';
  details: string;
}

const auditLog: PolicyAuditEntry[] = [];

function logAudit(event: PolicyAuditEntry['event'], details: string): void {
  auditLog.push({
    timestamp: new Date().toISOString(),
    event,
    details,
  });
  // Also emit to stderr for observability
  console.error(`[policy-audit] ${event}: ${details}`);
}

export function getAuditLog(): readonly PolicyAuditEntry[] {
  return auditLog;
}

// ── Default Policy ────────────────────────────────────────────────────────

const DEFAULT_POLICY: SpendPolicy = {
  version: 0,
  effectiveAt: '2026-01-01T00:00:00Z',
  maxPerTx: 0.1,        // 0.1 ETH default cap
  maxDailySpend: 1.0,   // 1 ETH daily default
  chainAllowlist: [],    // all chains
  tokenAllowlist: [],    // all tokens
  destinationAllowlist: [], // all destinations
};

// ── Policy Loading ────────────────────────────────────────────────────────

let activePolicy: SpendPolicy = { ...DEFAULT_POLICY };
let policyAdminAddress: `0x${string}` | null = null;

/**
 * Load policy from environment variables.
 * This is the operator-controlled bootstrap path.
 */
export function loadPolicyFromEnv(): SpendPolicy {
  const env = process.env;

  const policy: SpendPolicy = {
    version: parseInt(env.POLICY_VERSION ?? '0', 10),
    effectiveAt: env.POLICY_EFFECTIVE_AT ?? DEFAULT_POLICY.effectiveAt,
    maxPerTx: parseFloat(env.POLICY_MAX_PER_TX ?? String(DEFAULT_POLICY.maxPerTx)),
    maxDailySpend: parseFloat(env.POLICY_MAX_DAILY_SPEND ?? String(DEFAULT_POLICY.maxDailySpend)),
    chainAllowlist: env.POLICY_CHAIN_ALLOWLIST
      ? env.POLICY_CHAIN_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    tokenAllowlist: env.POLICY_TOKEN_ALLOWLIST
      ? env.POLICY_TOKEN_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    destinationAllowlist: env.POLICY_DESTINATION_ALLOWLIST
      ? env.POLICY_DESTINATION_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean)
      : [],
  };

  // Policy admin address for signed updates
  if (env.POLICY_ADMIN_ADDRESS) {
    policyAdminAddress = env.POLICY_ADMIN_ADDRESS as `0x${string}`;
  }

  activePolicy = policy;
  logAudit('policy_loaded', `v${policy.version} loaded from env (maxPerTx=${policy.maxPerTx}, maxDaily=${policy.maxDailySpend})`);
  return policy;
}

/**
 * Apply a signed policy update.
 * Verifies the signature against the pinned policy-admin public key.
 * Enforces version monotonicity (rollback protection).
 */
export async function applySignedPolicyUpdate(signed: SignedPolicy): Promise<{ accepted: boolean; reason?: string }> {
  if (!policyAdminAddress) {
    const reason = 'No POLICY_ADMIN_ADDRESS configured — signed updates are disabled';
    logAudit('policy_update_rejected', reason);
    return { accepted: false, reason };
  }

  // Verify signature
  const policyPayload = JSON.stringify(signed.policy);
  let valid: boolean;
  try {
    valid = await verifyMessage({
      address: policyAdminAddress,
      message: policyPayload,
      signature: signed.signature,
    });
  } catch {
    const reason = 'Signature verification failed';
    logAudit('policy_update_rejected', reason);
    return { accepted: false, reason };
  }

  if (!valid) {
    const reason = `Signature does not match policy admin ${policyAdminAddress}`;
    logAudit('policy_update_rejected', reason);
    return { accepted: false, reason };
  }

  // Rollback protection: version must be strictly increasing
  if (signed.policy.version <= activePolicy.version) {
    const reason = `Version ${signed.policy.version} is not greater than current ${activePolicy.version}`;
    logAudit('policy_update_rejected', reason);
    return { accepted: false, reason };
  }

  // Effective time check
  const effectiveTime = new Date(signed.policy.effectiveAt).getTime();
  if (isNaN(effectiveTime)) {
    const reason = `Invalid effectiveAt: ${signed.policy.effectiveAt}`;
    logAudit('policy_update_rejected', reason);
    return { accepted: false, reason };
  }

  activePolicy = { ...signed.policy };
  logAudit('policy_update_accepted', `v${signed.policy.version} applied (maxPerTx=${signed.policy.maxPerTx}, maxDaily=${signed.policy.maxDailySpend})`);
  return { accepted: true };
}

// ── Policy Enforcement ────────────────────────────────────────────────────

export function getActivePolicy(): Readonly<SpendPolicy> {
  return activePolicy;
}

/**
 * Check a proposed transaction against the active policy.
 * Returns an array of violations (empty = approved).
 */
export function checkPolicy(params: {
  amountEth: number;
  chain: string;
  token: string;
  destination: string;
}): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const policy = activePolicy;

  // Per-tx cap
  if (params.amountEth > policy.maxPerTx) {
    violations.push({
      rule: 'max_per_tx',
      message: `Amount ${params.amountEth} ETH exceeds per-transaction cap of ${policy.maxPerTx} ETH`,
    });
  }

  // Daily spend limit
  const dailyTotal = getDailySpendTotal();
  if (dailyTotal + params.amountEth > policy.maxDailySpend) {
    violations.push({
      rule: 'max_daily_spend',
      message: `This transaction (${params.amountEth} ETH) would exceed the 24h spend limit of ${policy.maxDailySpend} ETH (already spent: ${dailyTotal.toFixed(4)} ETH)`,
    });
  }

  // Chain allowlist
  if (policy.chainAllowlist.length > 0 && !policy.chainAllowlist.includes(params.chain)) {
    violations.push({
      rule: 'chain_allowlist',
      message: `Chain "${params.chain}" is not in the allowlist: ${policy.chainAllowlist.join(', ')}`,
    });
  }

  // Token allowlist
  if (policy.tokenAllowlist.length > 0) {
    const tokenNorm = params.token.toUpperCase();
    const allowed = policy.tokenAllowlist.map(t => t.toUpperCase());
    if (!allowed.includes(tokenNorm) && !policy.tokenAllowlist.includes(params.token)) {
      violations.push({
        rule: 'token_allowlist',
        message: `Token "${params.token}" is not in the allowlist: ${policy.tokenAllowlist.join(', ')}`,
      });
    }
  }

  // Destination allowlist
  if (policy.destinationAllowlist.length > 0) {
    const destNorm = params.destination.toLowerCase();
    const allowed = policy.destinationAllowlist.map(d => d.toLowerCase());
    if (!allowed.includes(destNorm)) {
      violations.push({
        rule: 'destination_allowlist',
        message: `Destination "${params.destination}" is not in the allowlist`,
      });
    }
  }

  if (violations.length > 0) {
    logAudit('policy_check_failed', violations.map(v => v.rule).join(', '));
  } else {
    logAudit('policy_check_passed', `${params.amountEth} ETH to ${params.destination} on ${params.chain}`);
  }

  return violations;
}

// ── Initialize on import ──────────────────────────────────────────────────

// Load policy from env on module init (operator context)
loadPolicyFromEnv();
