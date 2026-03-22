import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const {
  privateKeyToAccountMock,
  createPublicClientMock,
  getEnsNameMock,
  getPaymentProfileMock,
} = vi.hoisted(() => ({
  privateKeyToAccountMock: vi.fn(),
  createPublicClientMock: vi.fn(),
  getEnsNameMock: vi.fn(),
  getPaymentProfileMock: vi.fn(),
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: privateKeyToAccountMock,
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: createPublicClientMock,
    http: vi.fn(),
  };
});

vi.mock('../../src/lib/ens.js', () => ({
  getPaymentProfile: getPaymentProfileMock,
}));

import { registerGetMyProfile } from '../../src/tools/get-my-profile.js';

describe('tool:get-my-profile', () => {
  const originalSender = process.env.SENDER_PRIVATE_KEY;
  const originalEnsChain = process.env.ENS_CHAIN;

  beforeEach(() => {
    privateKeyToAccountMock.mockReset();
    createPublicClientMock.mockReset();
    getEnsNameMock.mockReset();
    getPaymentProfileMock.mockReset();

    process.env.SENDER_PRIVATE_KEY = originalSender;
    process.env.ENS_CHAIN = originalEnsChain;

    createPublicClientMock.mockReturnValue({
      getEnsName: getEnsNameMock,
    });
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerGetMyProfile, 'get-my-profile');
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY is not set');
  });

  it('returns wallet + ENS profile details when reverse ENS exists', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = '0x' + '2'.repeat(64);
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = '0x03' + '3'.repeat(64);
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = '0x' + '4'.repeat(64);

    privateKeyToAccountMock.mockReturnValue({
      address: '0xdddddddddddddddddddddddddddddddddddddddd',
    });
    getEnsNameMock.mockResolvedValue('alice.eth');
    getPaymentProfileMock.mockResolvedValue({
      ensName: 'alice.eth',
      address: '0xdddddddddddddddddddddddddddddddddddddddd',
      avatar: null,
      description: 'desc',
      preferredChains: ['eip155:11155111'],
      preferredAssets: [],
      preferredChain: 'sepolia',
      preferredToken: 'USDC',
      stealthMetaAddress: 'st:eth:0xabc',
      stealthPolicy: 'preferred',
      stealthSchemeIds: [1],
      notePolicy: 'optional',
      noteMaxBytes: 140,
      notePrivacy: 'plaintext',
    });

    const { handler } = registerAndGetTool(registerGetMyProfile, 'get-my-profile');
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Address: `0xdddddddddddddddddddddddddddddddddddddddd`');
    expect(result.content[0].text).toContain('Primary ENS: **alice.eth**');
    expect(result.content[0].text).toContain('Ready to receive stealth payments');
    expect(result.content[0].text).toContain('Viewing private key: ✅ configured');
  });
});
