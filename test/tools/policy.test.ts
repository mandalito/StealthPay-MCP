import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadPolicyFromEnv,
  checkPolicy,
  recordSpend,
  getActivePolicy,
  applySignedPolicyUpdate,
  getAuditLog,
  type SpendPolicy,
  type SignedPolicy,
} from '../../src/lib/policy.js';

describe('Policy engine', () => {
  beforeEach(() => {
    // Reset env and reload default policy
    delete process.env.POLICY_VERSION;
    delete process.env.POLICY_MAX_PER_TX;
    delete process.env.POLICY_MAX_DAILY_SPEND;
    delete process.env.POLICY_CHAIN_ALLOWLIST;
    delete process.env.POLICY_TOKEN_ALLOWLIST;
    delete process.env.POLICY_DESTINATION_ALLOWLIST;
    delete process.env.POLICY_ADMIN_ADDRESS;
    loadPolicyFromEnv();
  });

  describe('checkPolicy', () => {
    it('allows transactions within default limits', () => {
      const violations = checkPolicy({
        amountEth: 0.05,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'alice.eth',
      });
      expect(violations).toEqual([]);
    });

    it('blocks transactions exceeding per-tx cap', () => {
      const violations = checkPolicy({
        amountEth: 0.2,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'alice.eth',
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].rule).toBe('max_per_tx');
    });

    it('blocks transactions exceeding daily spend after accumulation', () => {
      // Spend up to the daily limit
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      recordSpend(0.09);
      // 11 * 0.09 = 0.99 spent

      const violations = checkPolicy({
        amountEth: 0.02,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'alice.eth',
      });
      expect(violations.some(v => v.rule === 'max_daily_spend')).toBe(true);
    });

    it('enforces chain allowlist', () => {
      process.env.POLICY_CHAIN_ALLOWLIST = 'sepolia,base';
      loadPolicyFromEnv();

      expect(checkPolicy({
        amountEth: 0.01,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'alice.eth',
      })).toEqual([]);

      const violations = checkPolicy({
        amountEth: 0.01,
        chain: 'ethereum',
        token: 'ETH',
        destination: 'alice.eth',
      });
      expect(violations.some(v => v.rule === 'chain_allowlist')).toBe(true);
    });

    it('enforces token allowlist', () => {
      process.env.POLICY_TOKEN_ALLOWLIST = 'ETH,USDC';
      loadPolicyFromEnv();

      expect(checkPolicy({
        amountEth: 0.01,
        chain: 'sepolia',
        token: 'USDC',
        destination: 'alice.eth',
      })).toEqual([]);

      const violations = checkPolicy({
        amountEth: 0.01,
        chain: 'sepolia',
        token: 'DAI',
        destination: 'alice.eth',
      });
      expect(violations.some(v => v.rule === 'token_allowlist')).toBe(true);
    });

    it('enforces destination allowlist', () => {
      process.env.POLICY_DESTINATION_ALLOWLIST = 'alice.eth,0x1234567890abcdef1234567890abcdef12345678';
      loadPolicyFromEnv();

      expect(checkPolicy({
        amountEth: 0.01,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'alice.eth',
      })).toEqual([]);

      const violations = checkPolicy({
        amountEth: 0.01,
        chain: 'sepolia',
        token: 'ETH',
        destination: 'bob.eth',
      });
      expect(violations.some(v => v.rule === 'destination_allowlist')).toBe(true);
    });
  });

  describe('loadPolicyFromEnv', () => {
    it('loads custom limits from env', () => {
      process.env.POLICY_MAX_PER_TX = '5.0';
      process.env.POLICY_MAX_DAILY_SPEND = '50.0';
      process.env.POLICY_VERSION = '3';
      loadPolicyFromEnv();

      const policy = getActivePolicy();
      expect(policy.maxPerTx).toBe(5.0);
      expect(policy.maxDailySpend).toBe(50.0);
      expect(policy.version).toBe(3);
    });
  });

  describe('applySignedPolicyUpdate', () => {
    it('rejects when no admin address is configured', async () => {
      const result = await applySignedPolicyUpdate({
        policy: { ...getActivePolicy(), version: 1 },
        signature: '0x00' as `0x${string}`,
      });
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('POLICY_ADMIN_ADDRESS');
    });

    it('rejects invalid signature before checking version', async () => {
      process.env.POLICY_VERSION = '5';
      process.env.POLICY_ADMIN_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
      loadPolicyFromEnv();

      const result = await applySignedPolicyUpdate({
        policy: { ...getActivePolicy(), version: 3 },
        signature: '0x00' as `0x${string}`,
      });
      expect(result.accepted).toBe(false);
      // Signature verification happens first; invalid signature is caught
      expect(result.reason).toBeTruthy();
    });
  });

  describe('audit log', () => {
    it('records policy load events', () => {
      loadPolicyFromEnv();
      const log = getAuditLog();
      expect(log.some(e => e.event === 'policy_loaded')).toBe(true);
    });

    it('records policy check events', () => {
      checkPolicy({ amountEth: 0.01, chain: 'sepolia', token: 'ETH', destination: 'alice.eth' });
      const log = getAuditLog();
      expect(log.some(e => e.event === 'policy_check_passed')).toBe(true);
    });
  });
});
