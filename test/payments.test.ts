/**
 * Unit tests for payment utilities.
 * No network required.
 */
import { describe, it, expect } from 'vitest';
import { createPaymentLink } from '../src/lib/payments.js';

describe('createPaymentLink', () => {
  it('generates a link with required fields', () => {
    const { webUrl } = createPaymentLink({ to: 'alice.eth' });
    expect(webUrl).toContain('to=alice.eth');
    expect(webUrl).toMatch('https://');
  });

  it('includes optional fields when provided', () => {
    const { webUrl } = createPaymentLink({
      to: 'bob.eth',
      amount: '100',
      token: 'USDC',
      chain: 'base',
      memo: 'dinner',
    });
    expect(webUrl).toContain('to=bob.eth');
    expect(webUrl).toContain('amount=100');
    expect(webUrl).toContain('token=USDC');
    expect(webUrl).toContain('chain=base');
    expect(webUrl).toContain('memo=dinner');
  });

  it('omits optional fields when not provided', () => {
    const { webUrl } = createPaymentLink({ to: 'carol.eth' });
    expect(webUrl).not.toContain('amount');
    expect(webUrl).not.toContain('token');
    expect(webUrl).not.toContain('chain');
    expect(webUrl).not.toContain('memo');
  });

  it('uses PAYMENT_LINK_BASE_URL env var when set', () => {
    const original = process.env.PAYMENT_LINK_BASE_URL;
    process.env.PAYMENT_LINK_BASE_URL = 'https://custom.app/pay';

    const { webUrl } = createPaymentLink({ to: 'test.eth' });
    expect(webUrl).toMatch('https://custom.app/pay');

    // Restore
    if (original) {
      process.env.PAYMENT_LINK_BASE_URL = original;
    } else {
      delete process.env.PAYMENT_LINK_BASE_URL;
    }
  });

  it('generates ERC-681 URI for .eth names', () => {
    const { erc681Uri } = createPaymentLink({ to: 'alice.eth', chain: 'base', amount: '10' });
    expect(erc681Uri).toBe('ethereum:alice.eth@8453?value=10e18');
  });

  it('returns null ERC-681 URI for non-.eth names', () => {
    const { erc681Uri } = createPaymentLink({ to: '0x1234' });
    expect(erc681Uri).toBeNull();
  });

  it('generates ERC-681 URI without chainId when chain is omitted', () => {
    const { erc681Uri } = createPaymentLink({ to: 'bob.eth' });
    expect(erc681Uri).toBe('ethereum:bob.eth');
  });
});
