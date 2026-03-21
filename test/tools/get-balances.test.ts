import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { createPublicClientMock, httpMock } = vi.hoisted(() => ({
  createPublicClientMock: vi.fn(),
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
    http: httpMock,
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: privateKeyToAccountMock,
}));

import { registerGetBalances } from '../../src/tools/get-balances.js';

describe('tool:get-balances', () => {
  const originalSender = process.env.SENDER_PRIVATE_KEY;

  beforeEach(() => {
    process.env.SENDER_PRIVATE_KEY = originalSender;
    createPublicClientMock.mockReset();
    privateKeyToAccountMock.mockReset();

    privateKeyToAccountMock.mockReturnValue({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerGetBalances, 'get-balances');
    const result = await handler({ chain: 'base' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY is not set');
  });

  it('fails on unsupported chain', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);

    const { handler } = registerAndGetTool(registerGetBalances, 'get-balances');
    const result = await handler({ chain: 'unknown' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unsupported chain: unknown');
  });

  it('returns ETH + token balances on supported chain', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);

    const getBalance = vi.fn().mockResolvedValue(1000000000000000000n); // 1 ETH

    let tokenIdx = 0;
    const readContract = vi.fn().mockImplementation(async ({ functionName }) => {
      if (functionName === 'balanceOf') {
        tokenIdx += 1;
        return tokenIdx === 1 ? 0n : 2500000000000000000n;
      }
      if (functionName === 'decimals') {
        return tokenIdx === 1 ? 6 : 18;
      }
      throw new Error('unexpected call');
    });

    createPublicClientMock.mockReturnValue({ getBalance, readContract });

    const { handler } = registerAndGetTool(registerGetBalances, 'get-balances');
    const result = await handler({ chain: 'base' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Balances for');
    expect(result.content[0].text).toContain('ETH: 1');
    expect(result.content[0].text).toContain('USDC: 0');
    expect(result.content[0].text).toContain('DAI: 2.5');
  });
});
