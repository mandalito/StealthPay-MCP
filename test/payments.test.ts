/**
 * Unit tests for payment utilities.
 * No network required.
 */
import { describe, it, expect } from 'vitest';
import { createPaymentLink } from '../src/lib/payments.js';

describe('createPaymentLink', () => {
  it('generates a link with required fields', () => {
    const link = createPaymentLink({ to: 'alice.eth' });
    expect(link).toContain('to=alice.eth');
    expect(link).toMatch('https://');
  });

  it('includes optional fields when provided', () => {
    const link = createPaymentLink({
      to: 'bob.eth',
      amount: '100',
      token: 'USDC',
      chain: 'base',
      memo: 'dinner',
    });
    expect(link).toContain('to=bob.eth');
    expect(link).toContain('amount=100');
    expect(link).toContain('token=USDC');
    expect(link).toContain('chain=base');
    expect(link).toContain('memo=dinner');
  });

  it('omits optional fields when not provided', () => {
    const link = createPaymentLink({ to: 'carol.eth' });
    expect(link).not.toContain('amount');
    expect(link).not.toContain('token');
    expect(link).not.toContain('chain');
    expect(link).not.toContain('memo');
  });

  it('uses PAYMENT_LINK_BASE_URL env var when set', () => {
    const original = process.env.PAYMENT_LINK_BASE_URL;
    process.env.PAYMENT_LINK_BASE_URL = 'https://custom.app/pay';

    const link = createPaymentLink({ to: 'test.eth' });
    expect(link).toMatch('https://custom.app/pay');

    // Restore
    if (original) {
      process.env.PAYMENT_LINK_BASE_URL = original;
    } else {
      delete process.env.PAYMENT_LINK_BASE_URL;
    }
  });
});
