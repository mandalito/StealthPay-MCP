/**
 * Integration test: ENS resolution against mainnet.
 * Requires network access. Uses a well-known ENS name.
 *
 * Run with: npx vitest run test/ens.integration.test.ts
 */
import { describe, it, expect } from 'vitest';
import { getPaymentProfile } from '../src/lib/ens.js';

describe('ENS integration (mainnet)', () => {
  it('resolves vitalik.eth to a valid profile', async () => {
    const profile = await getPaymentProfile('vitalik.eth');

    expect(profile.ensName).toBe('vitalik.eth');
    expect(profile.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // vitalik.eth has an avatar set
    expect(profile.avatar).toBeTruthy();
  });

  it('returns null address for a non-existent name', async () => {
    const profile = await getPaymentProfile(
      'this-name-definitely-does-not-exist-7f3a9b2c.eth'
    );
    expect(profile.address).toBeNull();
  });
});
