import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const {
  createPublicClientMock,
  createWalletClientMock,
  httpMock,
  namehashMock,
  privateKeyToAccountMock,
  waitForTransactionReceiptMock,
  writeContractMock,
} = vi.hoisted(() => ({
  createPublicClientMock: vi.fn(),
  createWalletClientMock: vi.fn(),
  httpMock: vi.fn(),
  namehashMock: vi.fn(),
  privateKeyToAccountMock: vi.fn(),
  waitForTransactionReceiptMock: vi.fn(),
  writeContractMock: vi.fn(),
}));

vi.mock('viem', () => ({
  createPublicClient: createPublicClientMock,
  createWalletClient: createWalletClientMock,
  http: httpMock,
  namehash: namehashMock,
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: privateKeyToAccountMock,
}));

import { registerSetProfile } from '../../src/tools/set-profile.js';
import { LEGACY_ENS_KEYS, V1_ENS_KEYS } from '../../src/lib/profile.js';

describe('tool:set-profile', () => {
  const originalSenderKey = process.env.SENDER_PRIVATE_KEY;
  const originalPolicyImmutable = process.env.POLICY_IMMUTABLE;
  const originalRpcUrl = process.env.RPC_URL;
  const originalEnsRpcUrl = process.env.ENS_RPC_URL;

  beforeEach(() => {
    process.env.SENDER_PRIVATE_KEY = originalSenderKey;
    process.env.POLICY_IMMUTABLE = originalPolicyImmutable;
    process.env.RPC_URL = originalRpcUrl;
    process.env.ENS_RPC_URL = originalEnsRpcUrl;

    waitForTransactionReceiptMock.mockReset();
    waitForTransactionReceiptMock.mockResolvedValue({ status: 'success' });

    writeContractMock.mockReset();
    writeContractMock.mockImplementation(async () => {
      const callCount = writeContractMock.mock.calls.length;
      return `0x${callCount.toString(16).padStart(64, '0')}`;
    });

    createPublicClientMock.mockReset();
    createPublicClientMock.mockReturnValue({
      waitForTransactionReceipt: waitForTransactionReceiptMock,
    });

    createWalletClientMock.mockReset();
    createWalletClientMock.mockReturnValue({
      writeContract: writeContractMock,
    });

    httpMock.mockReset();
    httpMock.mockReturnValue('mock-transport');

    namehashMock.mockReset();
    namehashMock.mockReturnValue('0x' + 'a'.repeat(64));

    privateKeyToAccountMock.mockReset();
    privateKeyToAccountMock.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111',
    });
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerSetProfile, 'set-profile');
    const result = await handler({ name: 'alice.eth', chain: 'base' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY is not set');
    expect(writeContractMock).not.toHaveBeenCalled();
  });

  it('blocks policy mutations when POLICY_IMMUTABLE is enabled', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.POLICY_IMMUTABLE = 'true';

    const { handler } = registerAndGetTool(registerSetProfile, 'set-profile');
    const result = await handler({
      name: 'alice.eth',
      stealthPolicy: 'required',
      notePolicy: 'required',
      ensChain: 'sepolia',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Policy fields');
    expect(writeContractMock).not.toHaveBeenCalled();
  });

  it('dual-writes versioned and legacy profile records for chain and token updates', async () => {
    process.env.SENDER_PRIVATE_KEY = '1'.repeat(64);
    process.env.ENS_RPC_URL = 'https://ens.example';

    const { handler } = registerAndGetTool(registerSetProfile, 'set-profile');
    const result = await handler({
      name: 'alice.eth',
      chain: 'base',
      token: 'USDC',
      description: 'Payments only',
      stealthPolicy: 'preferred',
      notePolicy: 'optional',
      noteMaxBytes: 280,
      notePrivacy: 'encrypted',
      ensChain: 'sepolia',
    });

    expect(result.isError).toBeUndefined();
    expect(httpMock).toHaveBeenCalledWith('https://ens.example');
    expect(namehashMock).toHaveBeenCalledWith('alice.eth');

    expect(writeContractMock).toHaveBeenCalledTimes(10);
    expect(writeContractMock.mock.calls.map(([call]) => call.args[1])).toEqual([
      V1_ENS_KEYS.version,
      V1_ENS_KEYS.preferredChains,
      LEGACY_ENS_KEYS.chain,
      V1_ENS_KEYS.preferredAssets,
      LEGACY_ENS_KEYS.token,
      LEGACY_ENS_KEYS.description,
      V1_ENS_KEYS.stealthPolicy,
      V1_ENS_KEYS.notePolicy,
      V1_ENS_KEYS.noteMaxBytes,
      V1_ENS_KEYS.notePrivacy,
    ]);

    expect(writeContractMock.mock.calls.map(([call]) => call.args[2])).toEqual([
      '1',
      'eip155:8453',
      'base',
      'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      'USDC',
      'Payments only',
      'preferred',
      'optional',
      '280',
      'encrypted',
    ]);

    expect(waitForTransactionReceiptMock).toHaveBeenCalledTimes(10);
    expect(result.content[0].text).toContain('Profile updated for **alice.eth**');
    expect(result.content[0].text).toContain('preferred chain: base (eip155:8453)');
    expect(result.content[0].text).toContain('legacy token: USDC');
  });
});
