import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createPublicClientMock, createWalletClientMock, httpMock } = vi.hoisted(() => ({
  createPublicClientMock: vi.fn(),
  createWalletClientMock: vi.fn(),
  httpMock: vi.fn(),
}));

const { privateKeyToAccountMock } = vi.hoisted(() => ({
  privateKeyToAccountMock: vi.fn(),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: createPublicClientMock,
    createWalletClient: createWalletClientMock,
    http: httpMock,
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: privateKeyToAccountMock,
}));

vi.mock('@noble/secp256k1', async () => {
  const actual = await vi.importActual<typeof import('@noble/secp256k1')>('@noble/secp256k1');
  return {
    ...actual,
    utils: {
      ...actual.utils,
      randomSecretKey: vi.fn(() => new Uint8Array(32).fill(7)),
    },
  };
});

import { registerEnsName } from '../src/lib/ens-register.js';

describe('registerEnsName receipt status checks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createPublicClientMock.mockReset();
    createWalletClientMock.mockReset();
    privateKeyToAccountMock.mockReset();

    privateKeyToAccountMock.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when register tx receipt is reverted', async () => {
    const readContract = vi
      .fn()
      .mockResolvedValueOnce(true) // available
      .mockResolvedValueOnce({ base: 1n, premium: 0n }) // rentPrice
      .mockResolvedValueOnce(0n) // minCommitmentAge
      .mockResolvedValueOnce('0x' + 'a'.repeat(64)); // commitment

    const waitForTransactionReceipt = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success' }) // commit
      .mockResolvedValueOnce({ status: 'reverted' }); // register

    const writeContract = vi
      .fn()
      .mockResolvedValueOnce('0x' + 'b'.repeat(64))
      .mockResolvedValueOnce('0x' + 'c'.repeat(64));

    createPublicClientMock.mockReturnValue({
      readContract,
      waitForTransactionReceipt,
    });
    createWalletClientMock.mockReturnValue({ writeContract });

    const promise = registerEnsName({
      label: 'alice',
      privateKey: ('0x' + '1'.repeat(64)) as `0x${string}`,
      chain: 'sepolia',
    });

    const expectation = expect(promise).rejects.toThrow('Register transaction reverted');
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('throws when commit tx receipt is reverted', async () => {
    const readContract = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({ base: 1n, premium: 0n })
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce('0x' + 'a'.repeat(64));

    const waitForTransactionReceipt = vi
      .fn()
      .mockResolvedValueOnce({ status: 'reverted' });

    const writeContract = vi
      .fn()
      .mockResolvedValueOnce('0x' + 'b'.repeat(64));

    createPublicClientMock.mockReturnValue({
      readContract,
      waitForTransactionReceipt,
    });
    createWalletClientMock.mockReturnValue({ writeContract });

    const promise = registerEnsName({
      label: 'alice',
      privateKey: ('0x' + '1'.repeat(64)) as `0x${string}`,
      chain: 'sepolia',
    });

    await expect(promise).rejects.toThrow('Commit transaction reverted');
  });
});
