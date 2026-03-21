/**
 * Unit tests for stealth address cryptography.
 * No network required — pure math.
 */
import { describe, it, expect } from 'vitest';
import { getPublicKey, utils } from '@noble/secp256k1';
import { bytesToHex } from 'viem/utils';
import { generateStealthAddress, checkStealthAddress } from '../src/lib/stealth.js';

/** Helper: create a stealth meta-address from a keypair (spending + viewing). */
function makeMetaAddress(
  spendingPub: Uint8Array,
  viewingPub: Uint8Array
): string {
  // Compressed pubkeys, concatenated, 0x-prefixed
  return (
    '0x' +
    bytesToHex(spendingPub).slice(2) +
    bytesToHex(viewingPub).slice(2)
  );
}

/** Helper: create a single-key stealth meta-address. */
function makeSingleKeyMetaAddress(pub: Uint8Array): string {
  return bytesToHex(pub);
}

describe('stealth address generation', () => {
  // Generate recipient keypairs (spending + viewing)
  const spendingPriv = utils.randomSecretKey();
  const spendingPub = getPublicKey(spendingPriv, true);
  const viewingPriv = utils.randomSecretKey();
  const viewingPub = getPublicKey(viewingPriv, true);

  const metaAddress = makeMetaAddress(spendingPub, viewingPub);

  it('generates a valid stealth address', () => {
    const result = generateStealthAddress(metaAddress);

    expect(result.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.ephemeralPublicKey).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(result.viewTag).toMatch(/^0x[0-9a-fA-F]{2}$/);
  });

  it('generates different addresses each time (ephemeral key is random)', () => {
    const a = generateStealthAddress(metaAddress);
    const b = generateStealthAddress(metaAddress);

    expect(a.stealthAddress).not.toBe(b.stealthAddress);
    expect(a.ephemeralPublicKey).not.toBe(b.ephemeralPublicKey);
  });

  it('round-trip: checkStealthAddress returns true for the correct recipient', () => {
    const result = generateStealthAddress(metaAddress);

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      spendingPublicKey: bytesToHex(spendingPub) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewingPriv) as `0x${string}`,
      userStealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });

    expect(isMatch).toBe(true);
  });

  it('checkStealthAddress returns false for wrong viewing key', () => {
    const result = generateStealthAddress(metaAddress);
    const wrongViewingPriv = utils.randomSecretKey();

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      spendingPublicKey: bytesToHex(spendingPub) as `0x${string}`,
      viewingPrivateKey: bytesToHex(wrongViewingPriv) as `0x${string}`,
      userStealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });

    // Overwhelmingly likely to be false (view tag mismatch = 255/256 chance)
    // In the rare 1/256 case the view tag matches, the address still won't match
    expect(isMatch).toBe(false);
  });

  it('checkStealthAddress returns false for wrong spending key', () => {
    const result = generateStealthAddress(metaAddress);
    const wrongSpendingPriv = utils.randomSecretKey();
    const wrongSpendingPub = getPublicKey(wrongSpendingPriv, true);

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      spendingPublicKey: bytesToHex(wrongSpendingPub) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewingPriv) as `0x${string}`,
      userStealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });

    expect(isMatch).toBe(false);
  });

  it('checkStealthAddress returns false for wrong stealth address', () => {
    const result = generateStealthAddress(metaAddress);

    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      spendingPublicKey: bytesToHex(spendingPub) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewingPriv) as `0x${string}`,
      userStealthAddress: '0x0000000000000000000000000000000000000001',
      viewTag: result.viewTag,
    });

    expect(isMatch).toBe(false);
  });
});

describe('stealth meta-address parsing', () => {
  const priv = utils.randomSecretKey();
  const pub = getPublicKey(priv, true);

  it('handles single-key meta-address (same key for spending + viewing)', () => {
    const meta = makeSingleKeyMetaAddress(pub);
    const result = generateStealthAddress(meta);

    expect(result.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // Round-trip with same key for both roles
    const isMatch = checkStealthAddress({
      ephemeralPublicKey: result.ephemeralPublicKey,
      spendingPublicKey: bytesToHex(pub) as `0x${string}`,
      viewingPrivateKey: bytesToHex(priv) as `0x${string}`,
      userStealthAddress: result.stealthAddress,
      viewTag: result.viewTag,
    });
    expect(isMatch).toBe(true);
  });

  it('handles st: URI prefix', () => {
    const meta = `st:eth:${makeSingleKeyMetaAddress(pub)}`;
    const result = generateStealthAddress(meta);
    expect(result.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('rejects invalid meta-address length', () => {
    expect(() => generateStealthAddress('0xdead')).toThrow(
      /Invalid stealth meta-address/
    );
  });

  it('rejects malformed st: URI', () => {
    expect(() => generateStealthAddress('st:')).toThrow(
      /Invalid stealth meta-address/
    );
    expect(() => generateStealthAddress('st:eth:')).toThrow(
      /Invalid stealth meta-address/
    );
  });
});

describe('multiple round-trips (statistical confidence)', () => {
  it('passes 20 consecutive round-trips', () => {
    for (let i = 0; i < 20; i++) {
      const spendPriv = utils.randomSecretKey();
      const spendPub = getPublicKey(spendPriv, true);
      const viewPriv = utils.randomSecretKey();
      const viewPub = getPublicKey(viewPriv, true);

      const meta = makeMetaAddress(spendPub, viewPub);
      const result = generateStealthAddress(meta);

      const isMatch = checkStealthAddress({
        ephemeralPublicKey: result.ephemeralPublicKey,
        spendingPublicKey: bytesToHex(spendPub) as `0x${string}`,
        viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
        userStealthAddress: result.stealthAddress,
        viewTag: result.viewTag,
      });

      expect(isMatch).toBe(true);
    }
  });
});
