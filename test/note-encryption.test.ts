import { describe, it, expect } from 'vitest';
import { getPublicKey, utils } from '@noble/secp256k1';
import { bytesToHex } from 'viem/utils';
import {
  encryptNote,
  decryptNote,
  encryptNoteDualEnvelope,
  decryptNoteWithSpendKey,
} from '../src/lib/note-encryption.js';

function generateKeypair(): { privKey: `0x${string}`; pubKey: `0x${string}` } {
  const priv = utils.randomSecretKey();
  const pub = getPublicKey(priv, true); // compressed
  return {
    privKey: `0x${bytesToHex(priv).replace(/^0x/, '')}` as `0x${string}`,
    pubKey: `0x${bytesToHex(pub).replace(/^0x/, '')}` as `0x${string}`,
  };
}

describe('Note encryption — baseline mode', () => {
  it('encrypts and decrypts a note with view key', () => {
    const viewKey = generateKeypair();
    const message = 'Payment for March invoice';

    const { envelope } = encryptNote(message, viewKey.pubKey);
    const decrypted = decryptNote(envelope, viewKey.privKey);

    expect(decrypted).toBe(message);
  });

  it('produces different ciphertext each time (random ephemeral key)', () => {
    const viewKey = generateKeypair();
    const message = 'Test note';

    const { envelope: e1 } = encryptNote(message, viewKey.pubKey);
    const { envelope: e2 } = encryptNote(message, viewKey.pubKey);

    expect(e1).not.toBe(e2);
  });

  it('returns an ephemeral private key for sender retention', () => {
    const viewKey = generateKeypair();
    const { ephemeralPrivateKey } = encryptNote('test', viewKey.pubKey);

    expect(ephemeralPrivateKey).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('fails to decrypt with wrong key', () => {
    const viewKey = generateKeypair();
    const wrongKey = generateKeypair();
    const { envelope } = encryptNote('secret', viewKey.pubKey);

    expect(() => decryptNote(envelope, wrongKey.privKey)).toThrow();
  });

  it('handles unicode content', () => {
    const viewKey = generateKeypair();
    const message = '付款说明 🔒 données de paiement';

    const { envelope } = encryptNote(message, viewKey.pubKey);
    const decrypted = decryptNote(envelope, viewKey.privKey);

    expect(decrypted).toBe(message);
  });

  it('handles empty string', () => {
    const viewKey = generateKeypair();
    const { envelope } = encryptNote('', viewKey.pubKey);
    const decrypted = decryptNote(envelope, viewKey.privKey);
    expect(decrypted).toBe('');
  });
});

describe('Note encryption — dual-envelope mode', () => {
  it('encrypts and decrypts with view key', () => {
    const viewKey = generateKeypair();
    const spendKey = generateKeypair();
    const message = 'Dual-envelope test';

    const { envelope } = encryptNoteDualEnvelope(message, viewKey.pubKey, spendKey.pubKey);
    const decrypted = decryptNote(envelope, viewKey.privKey);

    expect(decrypted).toBe(message);
  });

  it('encrypts and decrypts with spend key', () => {
    const viewKey = generateKeypair();
    const spendKey = generateKeypair();
    const message = 'Dual-envelope test for spend key';

    const { envelope } = encryptNoteDualEnvelope(message, viewKey.pubKey, spendKey.pubKey);
    const decrypted = decryptNoteWithSpendKey(envelope, spendKey.privKey);

    expect(decrypted).toBe(message);
  });

  it('both key paths produce the same plaintext', () => {
    const viewKey = generateKeypair();
    const spendKey = generateKeypair();
    const message = 'Consistent decryption test';

    const { envelope } = encryptNoteDualEnvelope(message, viewKey.pubKey, spendKey.pubKey);
    const fromView = decryptNote(envelope, viewKey.privKey);
    const fromSpend = decryptNoteWithSpendKey(envelope, spendKey.privKey);

    expect(fromView).toBe(message);
    expect(fromSpend).toBe(message);
    expect(fromView).toBe(fromSpend);
  });

  it('rejects decryptNoteWithSpendKey on baseline envelope', () => {
    const viewKey = generateKeypair();
    const spendKey = generateKeypair();
    const { envelope } = encryptNote('baseline only', viewKey.pubKey);

    expect(() => decryptNoteWithSpendKey(envelope, spendKey.privKey)).toThrow('Not a dual-envelope');
  });
});
