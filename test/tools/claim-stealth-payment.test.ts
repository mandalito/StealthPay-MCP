import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { deriveStealthPrivateKeyMock, withdrawFromStealthMock } = vi.hoisted(() => ({
  deriveStealthPrivateKeyMock: vi.fn(),
  withdrawFromStealthMock: vi.fn(),
}));

vi.mock('../../src/lib/stealth.js', () => ({
  deriveStealthPrivateKey: deriveStealthPrivateKeyMock,
}));

vi.mock('../../src/lib/withdraw.js', () => ({
  withdrawFromStealth: withdrawFromStealthMock,
}));

import { registerClaimStealthPayment } from '../../src/tools/claim-stealth-payment.js';

describe('tool:claim-stealth-payment', () => {
  const originalSpend = process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
  const originalView = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

  beforeEach(() => {
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = originalSpend;
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = originalView;
    deriveStealthPrivateKeyMock.mockReset();
    withdrawFromStealthMock.mockReset();
  });

  it('fails when recipient private keys are missing', async () => {
    delete process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
    delete process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerClaimStealthPayment, 'claim-stealth-payment');
    const result = await handler({
      ephemeralPublicKey: '0x02cc',
      to: '0x7777777777777777777777777777777777777777',
      token: 'ETH',
      chain: 'sepolia',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing keys');
  });

  it('derives and withdraws in one call path', async () => {
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = '1'.repeat(64); // no 0x
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = '2'.repeat(64); // no 0x

    deriveStealthPrivateKeyMock.mockReturnValue({
      stealthPrivateKey: '0x' + '3'.repeat(64),
      stealthAddress: '0x8888888888888888888888888888888888888888',
    });

    withdrawFromStealthMock.mockResolvedValue({
      from: '0x8888888888888888888888888888888888888888',
      to: '0x7777777777777777777777777777777777777777',
      amount: '0.1',
      token: 'ETH',
      txHash: '0xclaim',
    });

    const { handler } = registerAndGetTool(registerClaimStealthPayment, 'claim-stealth-payment');
    const result = await handler({
      ephemeralPublicKey: '02cc', // no 0x
      to: '0x7777777777777777777777777777777777777777',
      token: 'ETH',
      chain: 'sepolia',
    });

    expect(result.isError).toBeUndefined();
    expect(deriveStealthPrivateKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spendingPrivateKey: '0x' + '1'.repeat(64),
        viewingPrivateKey: '0x' + '2'.repeat(64),
        ephemeralPublicKey: '0x02cc',
      }),
    );
    expect(result.content[0].text).toContain('Stealth payment claimed successfully.');
    expect(result.content[0].text).toContain('Tx: https://');
    expect(result.content[0].text).toContain('0xclaim');
  });
});
