import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { createPaymentLinkMock } = vi.hoisted(() => ({
  createPaymentLinkMock: vi.fn(),
}));

vi.mock('../../src/lib/payments.js', () => ({
  createPaymentLink: createPaymentLinkMock,
}));

import { registerCreatePaymentLink } from '../../src/tools/create-payment-link.js';

describe('tool:create-payment-link', () => {
  beforeEach(() => {
    createPaymentLinkMock.mockReset();
  });

  it('returns link content on success', async () => {
    createPaymentLinkMock.mockReturnValue('https://stealthpay.link/pay?to=alice.eth');
    const { handler } = registerAndGetTool(registerCreatePaymentLink, 'create-payment-link');

    const result = await handler({ to: 'alice.eth', amount: '5', token: 'USDC', chain: 'base' });

    expect(result.isError).toBeUndefined();
    expect(createPaymentLinkMock).toHaveBeenCalledWith({
      to: 'alice.eth',
      amount: '5',
      token: 'USDC',
      chain: 'base',
      memo: undefined,
    });
    expect(result.content[0].text).toContain('https://stealthpay.link/pay?to=alice.eth');
    expect(result.content[0].text).toContain('Recipient: alice.eth');
  });

  it('returns tool error when payment link creation throws', async () => {
    createPaymentLinkMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const { handler } = registerAndGetTool(registerCreatePaymentLink, 'create-payment-link');

    const result = await handler({ to: 'alice.eth' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error creating payment link: boom');
  });
});
