/**
 * Unit tests for stealth address cryptography.
 * No network required — pure math.
 */
import { describe, it, expect } from 'vitest';
import { getPublicKey, utils } from '@noble/secp256k1';
import { bytesToHex } from 'viem/utils';
import { generateStealthAddress, checkStealthAddress, deriveStealthPrivateKey } from '../src/lib/stealth.js';
import { privateKeyToAccount } from 'viem/accounts';

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

describe('deriveStealthPrivateKey', () => {
  const spendPriv = utils.randomSecretKey();
  const spendPub = getPublicKey(spendPriv, true);
  const viewPriv = utils.randomSecretKey();
  const viewPub = getPublicKey(viewPriv, true);
  const metaAddress = makeMetaAddress(spendPub, viewPub);

  it('derives a key that controls the stealth address', () => {
    const stealth = generateStealthAddress(metaAddress);

    const derived = deriveStealthPrivateKey({
      spendingPrivateKey: bytesToHex(spendPriv) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
      ephemeralPublicKey: stealth.ephemeralPublicKey,
    });

    // The derived address must match the generated stealth address
    expect(derived.stealthAddress.toLowerCase()).toBe(
      stealth.stealthAddress.toLowerCase()
    );
  });

  it('derived key can sign as the stealth address (viem account)', () => {
    const stealth = generateStealthAddress(metaAddress);

    const derived = deriveStealthPrivateKey({
      spendingPrivateKey: bytesToHex(spendPriv) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
      ephemeralPublicKey: stealth.ephemeralPublicKey,
    });

    // Create a viem account from the derived key and verify the address
    const account = privateKeyToAccount(derived.stealthPrivateKey);
    expect(account.address.toLowerCase()).toBe(
      stealth.stealthAddress.toLowerCase()
    );
  });

  it('passes expectedAddress verification', () => {
    const stealth = generateStealthAddress(metaAddress);

    // Should not throw
    const derived = deriveStealthPrivateKey({
      spendingPrivateKey: bytesToHex(spendPriv) as `0x${string}`,
      viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
      ephemeralPublicKey: stealth.ephemeralPublicKey,
      expectedAddress: stealth.stealthAddress,
    });

    expect(derived.stealthAddress.toLowerCase()).toBe(
      stealth.stealthAddress.toLowerCase()
    );
  });

  it('throws on expectedAddress mismatch', () => {
    const stealth = generateStealthAddress(metaAddress);

    expect(() =>
      deriveStealthPrivateKey({
        spendingPrivateKey: bytesToHex(spendPriv) as `0x${string}`,
        viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
        ephemeralPublicKey: stealth.ephemeralPublicKey,
        expectedAddress: '0x0000000000000000000000000000000000000001',
      })
    ).toThrow(/does not match expected/);
  });
});

describe('full round-trip: generate → check → derive (20 iterations)', () => {
  it('all three steps are consistent', () => {
    for (let i = 0; i < 20; i++) {
      const spendPriv = utils.randomSecretKey();
      const spendPub = getPublicKey(spendPriv, true);
      const viewPriv = utils.randomSecretKey();
      const viewPub = getPublicKey(viewPriv, true);

      const meta = makeMetaAddress(spendPub, viewPub);
      const stealth = generateStealthAddress(meta);

      // Check
      const isOurs = checkStealthAddress({
        ephemeralPublicKey: stealth.ephemeralPublicKey,
        spendingPublicKey: bytesToHex(spendPub) as `0x${string}`,
        viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
        userStealthAddress: stealth.stealthAddress,
        viewTag: stealth.viewTag,
      });
      expect(isOurs).toBe(true);

      // Derive
      const derived = deriveStealthPrivateKey({
        spendingPrivateKey: bytesToHex(spendPriv) as `0x${string}`,
        viewingPrivateKey: bytesToHex(viewPriv) as `0x${string}`,
        ephemeralPublicKey: stealth.ephemeralPublicKey,
        expectedAddress: stealth.stealthAddress,
      });

      const account = privateKeyToAccount(derived.stealthPrivateKey);
      expect(account.address.toLowerCase()).toBe(
        stealth.stealthAddress.toLowerCase()
      );
    }
  });
});
