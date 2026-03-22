import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { getPaymentProfileMock } = vi.hoisted(() => ({
  getPaymentProfileMock: vi.fn(),
}));

vi.mock('../../src/lib/ens.js', () => ({
  getPaymentProfile: getPaymentProfileMock,
}));

import { registerGetPaymentProfile } from '../../src/tools/get-payment-profile.js';
import {
  isValidStealthPolicy,
  isValidNotePolicy,
  isValidNotePrivacy,
  STEALTH_POLICIES,
  NOTE_POLICIES,
  NOTE_PRIVACIES,
  PROFILE_DEFAULTS,
  V1_ENS_KEYS,
  LEGACY_ENS_KEYS,
} from '../../src/lib/profile.js';
import { CAIP2_CHAIN_IDS, CAIP2_TO_NAME, resolveChainName, toCAIP19, parseCAIP19 } from '../../src/config.js';

describe('Profile migration: canonical key precedence over legacy', () => {
  beforeEach(() => getPaymentProfileMock.mockReset());

  it('v1 chain takes precedence over legacy chain', async () => {
    getPaymentProfileMock.mockResolvedValue({
      ensName: 'alice.eth',
      address: '0x1111111111111111111111111111111111111111',
      avatar: null,
      description: null,
      // v1 says base, but legacy would say "ethereum"
      preferredChains: ['eip155:8453'],
      preferredAssets: [],
      preferredChain: 'base', // derived from v1, not legacy
      preferredToken: null,
      stealthMetaAddress: '0xabcdef',
      stealthPolicy: 'preferred',
      stealthSchemeIds: [1],
      notePolicy: 'optional',
      noteMaxBytes: 140,
      notePrivacy: 'plaintext',
    });

    const { handler } = registerAndGetTool(registerGetPaymentProfile, 'get-payment-profile');
    const result = await handler({ name: 'alice.eth' });

    expect(result.content[0].text).toContain('base');
  });

  it('v1 stealth policy takes precedence over default', async () => {
    getPaymentProfileMock.mockResolvedValue({
      ensName: 'alice.eth',
      address: '0x1111111111111111111111111111111111111111',
      avatar: null,
      description: null,
      preferredChains: [],
      preferredAssets: [],
      preferredChain: null,
      preferredToken: null,
      stealthMetaAddress: '0xabcdef',
      stealthPolicy: 'required',
      stealthSchemeIds: [1],
      notePolicy: 'required',
      noteMaxBytes: 280,
      notePrivacy: 'encrypted',
    });

    const { handler } = registerAndGetTool(registerGetPaymentProfile, 'get-payment-profile');
    const result = await handler({ name: 'alice.eth' });

    expect(result.content[0].text).toContain('Stealth policy: required');
    expect(result.content[0].text).toContain('Note policy: required');
  });
});

describe('Profile migration: CAIP validation', () => {
  it('valid CAIP-2 chain IDs resolve correctly', () => {
    expect(resolveChainName('eip155:8453')).toBe('base');
    expect(resolveChainName('eip155:1')).toBe('ethereum');
    expect(resolveChainName('eip155:11155111')).toBe('sepolia');
  });

  it('invalid CAIP-2 chain IDs return null', () => {
    expect(resolveChainName('eip155:999999')).toBeNull();
    expect(resolveChainName('notcaip')).toBeNull();
    expect(resolveChainName('')).toBeNull();
  });

  it('valid friendly chain names resolve', () => {
    expect(resolveChainName('base')).toBe('base');
    expect(resolveChainName('sepolia')).toBe('sepolia');
  });

  it('CAIP-19 round-trips for native ETH', () => {
    const caip19 = toCAIP19('base', 'ETH');
    expect(caip19).toBe('eip155:8453/slip44:60');
    const parsed = parseCAIP19(caip19!);
    expect(parsed).not.toBeNull();
    expect(parsed!.chainName).toBe('base');
    expect(parsed!.isNative).toBe(true);
  });

  it('CAIP-19 round-trips for ERC-20', () => {
    const addr = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const caip19 = toCAIP19('base', addr);
    expect(caip19).toBe(`eip155:8453/erc20:${addr.toLowerCase()}`);
    const parsed = parseCAIP19(caip19!);
    expect(parsed).not.toBeNull();
    expect(parsed!.chainName).toBe('base');
    expect(parsed!.isNative).toBe(false);
    expect(parsed!.tokenAddress.toLowerCase()).toBe(addr.toLowerCase());
  });

  it('malformed CAIP-19 returns null', () => {
    expect(parseCAIP19('')).toBeNull();
    expect(parseCAIP19('not-caip')).toBeNull();
    expect(parseCAIP19('eip155:999999/slip44:60')).toBeNull(); // unknown chain
    expect(parseCAIP19('eip155:1/erc20:notanaddress')).toBeNull();
  });

  it('toCAIP19 returns null for unknown chain', () => {
    expect(toCAIP19('notachain', 'ETH')).toBeNull();
  });
});

describe('Profile migration: policy enum validation', () => {
  it('rejects invalid stealthPolicy values', () => {
    expect(isValidStealthPolicy('always')).toBe(false);
    expect(isValidStealthPolicy('REQUIRED')).toBe(false); // case-sensitive
    expect(isValidStealthPolicy('')).toBe(false);
    expect(isValidStealthPolicy('true')).toBe(false);
  });

  it('accepts all valid stealthPolicy values', () => {
    for (const v of STEALTH_POLICIES) {
      expect(isValidStealthPolicy(v)).toBe(true);
    }
  });

  it('rejects invalid notePolicy values', () => {
    expect(isValidNotePolicy('disabled')).toBe(false);
    expect(isValidNotePolicy('NONE')).toBe(false);
    expect(isValidNotePolicy('')).toBe(false);
  });

  it('accepts all valid notePolicy values', () => {
    for (const v of NOTE_POLICIES) {
      expect(isValidNotePolicy(v)).toBe(true);
    }
  });

  it('rejects invalid notePrivacy values', () => {
    expect(isValidNotePrivacy('clear')).toBe(false);
    expect(isValidNotePrivacy('ENCRYPTED')).toBe(false);
    expect(isValidNotePrivacy('')).toBe(false);
  });

  it('accepts all valid notePrivacy values', () => {
    for (const v of NOTE_PRIVACIES) {
      expect(isValidNotePrivacy(v)).toBe(true);
    }
  });
});

describe('Profile migration: dual-write consistency', () => {
  it('V1_ENS_KEYS and LEGACY_ENS_KEYS have no overlapping values', () => {
    const v1Values = Object.values(V1_ENS_KEYS);
    const legacyValues = Object.values(LEGACY_ENS_KEYS);
    for (const v of v1Values) {
      expect(legacyValues).not.toContain(v);
    }
  });

  it('all CAIP-2 chain IDs have reverse mappings', () => {
    for (const [name, caip] of Object.entries(CAIP2_CHAIN_IDS)) {
      expect(CAIP2_TO_NAME[caip]).toBe(name);
    }
  });

  it('PROFILE_DEFAULTS have valid enum values', () => {
    expect(isValidStealthPolicy(PROFILE_DEFAULTS.stealthPolicy)).toBe(true);
    expect(isValidNotePolicy(PROFILE_DEFAULTS.notePolicy)).toBe(true);
    expect(isValidNotePrivacy(PROFILE_DEFAULTS.notePrivacy)).toBe(true);
    expect(PROFILE_DEFAULTS.noteMaxBytes).toBeGreaterThan(0);
    expect(PROFILE_DEFAULTS.stealthSchemeIds).toContain(1);
  });
});
