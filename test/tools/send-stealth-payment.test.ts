import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const {
  getStealthMetaAddressMock,
  generateStealthAddressMock,
  sendToStealthMock,
} = vi.hoisted(() => ({
  getStealthMetaAddressMock: vi.fn(),
  generateStealthAddressMock: vi.fn(),
  sendToStealthMock: vi.fn(),
}));

vi.mock('../../src/lib/ens.js', () => ({
  getStealthMetaAddress: getStealthMetaAddressMock,
}));

vi.mock('../../src/lib/stealth.js', () => ({
  generateStealthAddress: generateStealthAddressMock,
}));

vi.mock('../../src/lib/payments.js', () => ({
  sendToStealth: sendToStealthMock,
}));

import { registerSendStealthPayment } from '../../src/tools/send-stealth-payment.js';

describe('tool:send-stealth-payment', () => {
  const originalSenderKey = process.env.SENDER_PRIVATE_KEY;

  beforeEach(() => {
    process.env.SENDER_PRIVATE_KEY = originalSenderKey;
    getStealthMetaAddressMock.mockReset();
    generateStealthAddressMock.mockReset();
    sendToStealthMock.mockReset();
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;
    const { handler } = registerAndGetTool(registerSendStealthPayment, 'send-stealth-payment');

    const result = await handler({ to: 'alice.eth', amount: '1', token: 'USDC', chain: 'base' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY environment variable is not set');
  });

  it('fails when recipient has no stealth meta-address', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    getStealthMetaAddressMock.mockResolvedValue(null);

    const { handler } = registerAndGetTool(registerSendStealthPayment, 'send-stealth-payment');
    const result = await handler({ to: 'alice.eth', amount: '1', token: 'USDC', chain: 'base' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No stealth meta-address found for "alice.eth"');
  });

  it('returns warning block when announce step fails', async () => {
    process.env.SENDER_PRIVATE_KEY = '2'.repeat(64); // no 0x on purpose
    getStealthMetaAddressMock.mockResolvedValue('st:eth:0xabc');
    generateStealthAddressMock.mockReturnValue({
      stealthAddress: '0x3333333333333333333333333333333333333333',
      ephemeralPublicKey: '0x02bb',
      viewTag: '0xaa',
    });
    sendToStealthMock.mockResolvedValue({
      transferTxHash: '0xtransfer',
      announceTxHash: null,
      announceFailed: true,
      tokenLabel: 'USDC',
    });

    const { handler } = registerAndGetTool(registerSendStealthPayment, 'send-stealth-payment');
    const result = await handler({ to: 'alice.eth', amount: '1', token: 'USDC', chain: 'base' });

    expect(result.isError).toBeUndefined();
    expect(sendToStealthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: '0x' + '2'.repeat(64),
        to: '0x3333333333333333333333333333333333333333',
      }),
    );
    expect(result.content[0].text).toContain('WARNING: The ERC-5564 announcement transaction failed');
    expect(result.content[0].text).toContain('Transfer tx: https://');
    expect(result.content[0].text).toContain('Ephemeral public key: `0x02bb`');
  });
});
