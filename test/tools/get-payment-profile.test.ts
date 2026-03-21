import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { getPaymentProfileMock } = vi.hoisted(() => ({
  getPaymentProfileMock: vi.fn(),
}));

vi.mock('../../src/lib/ens.js', () => ({
  getPaymentProfile: getPaymentProfileMock,
}));

import { registerGetPaymentProfile } from '../../src/tools/get-payment-profile.js';

describe('tool:get-payment-profile', () => {
  beforeEach(() => {
    getPaymentProfileMock.mockReset();
  });

  it('returns error when ENS does not resolve to an address', async () => {
    getPaymentProfileMock.mockResolvedValue({
      ensName: 'alice.eth',
      address: null,
      avatar: null,
      preferredChain: null,
      preferredToken: null,
      stealthMetaAddress: null,
      description: null,
    });

    const { handler } = registerAndGetTool(registerGetPaymentProfile, 'get-payment-profile');
    const result = await handler({ name: 'alice.eth' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Could not resolve ENS name "alice.eth"');
  });

  it('returns profile details when ENS resolves', async () => {
    getPaymentProfileMock.mockResolvedValue({
      ensName: 'alice.eth',
      address: '0x2222222222222222222222222222222222222222',
      avatar: 'ipfs://avatar',
      preferredChain: 'sepolia',
      preferredToken: 'USDC',
      stealthMetaAddress: 'st:eth:0xabc',
      description: 'hello',
    });

    const { handler } = registerAndGetTool(registerGetPaymentProfile, 'get-payment-profile');
    const result = await handler({ name: 'alice.eth' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Address: 0x2222222222222222222222222222222222222222');
    expect(result.content[0].text).toContain('Stealth meta-address: st:eth:0xabc');
    expect(result.content[0].text).toContain('supports stealth payments');
  });
});
