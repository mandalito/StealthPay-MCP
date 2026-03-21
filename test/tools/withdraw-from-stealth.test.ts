import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { withdrawFromStealthMock } = vi.hoisted(() => ({
  withdrawFromStealthMock: vi.fn(),
}));

vi.mock('../../src/lib/withdraw.js', () => ({
  withdrawFromStealth: withdrawFromStealthMock,
}));

import { registerWithdrawFromStealth } from '../../src/tools/withdraw-from-stealth.js';

describe('tool:withdraw-from-stealth', () => {
  beforeEach(() => {
    withdrawFromStealthMock.mockReset();
  });

  it('calls withdraw lib and returns success response', async () => {
    withdrawFromStealthMock.mockResolvedValue({
      from: '0x6666666666666666666666666666666666666666',
      to: '0x7777777777777777777777777777777777777777',
      amount: '0.1',
      token: 'ETH',
      txHash: '0xwithdraw',
    });

    const { handler } = registerAndGetTool(registerWithdrawFromStealth, 'withdraw-from-stealth');
    const result = await handler({
      stealthPrivateKey: '0x' + '1'.repeat(64),
      to: '0x7777777777777777777777777777777777777777',
      token: 'ETH',
      chain: 'sepolia',
    });

    expect(result.isError).toBeUndefined();
    expect(withdrawFromStealthMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'ETH' }),
    );
    expect(result.content[0].text).toContain('Withdrawal successful.');
    expect(result.content[0].text).toContain('Tx: https://');
    expect(result.content[0].text).toContain('0xwithdraw');
  });

  it('returns tool error when withdraw fails', async () => {
    withdrawFromStealthMock.mockRejectedValue(new Error('no gas'));

    const { handler } = registerAndGetTool(registerWithdrawFromStealth, 'withdraw-from-stealth');
    const result = await handler({
      stealthPrivateKey: '0x' + '1'.repeat(64),
      to: '0x7777777777777777777777777777777777777777',
      token: 'ETH',
      chain: 'sepolia',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error withdrawing: no gas');
  });
});
