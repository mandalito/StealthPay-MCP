/**
 * Encrypted note support for stealth payments.
 *
 * Uses the recipient's viewing public key to derive a shared secret,
 * then encrypts the note with ChaCha20-Poly1305 (via @noble/hashes).
 *
 * Envelope format (baseline mode):
 *   [1 byte version] [32 bytes ephemeral pubkey x-coord] [12 bytes nonce] [N bytes ciphertext+tag]
 *
 * Version 0x01 = baseline (viewPub-derived shared secret)
 * Version 0x02 = dual-envelope (spendPub OR viewPub can decrypt)
 *
 * ── Baseline mode ──
 * Sender generates an ephemeral keypair, does ECDH with recipient viewPub,
 * derives a symmetric key via HKDF-SHA256, encrypts with ChaCha20-Poly1305.
 * Sender retains ephemeral privkey to decrypt their own sent notes.
 *
 * ── Dual-envelope mode (optional) ──
 * Wraps a random content key (CEK) for both spend and view key paths:
 *   [1 byte version=0x02]
 *   [32 bytes ephView x] [12 bytes nonce1] [48 bytes wrapped-CEK-for-view]
 *   [32 bytes ephSpend x] [12 bytes nonce2] [48 bytes wrapped-CEK-for-spend]
 *   [12 bytes nonce3] [N bytes ciphertext]
 * Either spendPriv or viewPriv can unwrap the CEK to decrypt the note.
 */

import { getSharedSecret, getPublicKey, utils } from '@noble/secp256k1';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hexToBytes, bytesToHex } from 'viem/utils';
import { randomBytes } from '@noble/hashes/utils.js';

const NOTE_VERSION_BASELINE = 0x01;
const NOTE_VERSION_DUAL = 0x02;
const HKDF_INFO = new TextEncoder().encode('stealthpay-note-v1');

/**
 * Derive a symmetric key from ECDH shared secret.
 */
function deriveSymmetricKey(sharedSecretX: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecretX, undefined, HKDF_INFO, 32);
}

/**
 * Encrypt a note using the recipient's viewing public key (baseline mode).
 *
 * @param plaintext - UTF-8 note content
 * @param recipientViewPub - Recipient's compressed viewing public key (hex)
 * @returns Encrypted envelope as hex string, plus the ephemeral private key for sender retention
 */
export function encryptNote(
  plaintext: string,
  recipientViewPub: `0x${string}`,
): { envelope: `0x${string}`; ephemeralPrivateKey: `0x${string}` } {
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate ephemeral keypair
  const ephPriv = utils.randomSecretKey();
  const ephPubCompressed = getPublicKey(ephPriv, true);

  // ECDH: shared secret x-coordinate
  const sharedCompressed = getSharedSecret(ephPriv, hexToBytes(recipientViewPub));
  const sharedX = sharedCompressed.slice(1); // 32 bytes

  // Derive symmetric key
  const symKey = deriveSymmetricKey(sharedX);

  // Encrypt with ChaCha20-Poly1305
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(symKey, nonce);
  const ciphertext = cipher.encrypt(plaintextBytes);

  // Build envelope: [version(1)] [ephPubX(32)] [nonce(12)] [ciphertext(N)]
  const ephPubX = ephPubCompressed.slice(1); // drop prefix byte, keep 32-byte x-coord
  const envelope = new Uint8Array(1 + 32 + 12 + ciphertext.length);
  envelope[0] = NOTE_VERSION_BASELINE;
  envelope.set(ephPubX, 1);
  envelope.set(nonce, 33);
  envelope.set(ciphertext, 45);

  return {
    envelope: `0x${bytesToHex(envelope).replace(/^0x/, '')}` as `0x${string}`,
    ephemeralPrivateKey: `0x${bytesToHex(ephPriv).replace(/^0x/, '')}` as `0x${string}`,
  };
}

/**
 * Decrypt a note using the recipient's viewing private key.
 * Supports both baseline (v1) and dual-envelope (v2) formats.
 */
export function decryptNote(
  envelope: `0x${string}`,
  recipientViewPriv: `0x${string}`,
): string {
  const data = hexToBytes(envelope);

  if (data.length < 46) {
    throw new Error('Encrypted note envelope too short');
  }

  const version = data[0];

  if (version === NOTE_VERSION_BASELINE) {
    return decryptBaseline(data, recipientViewPriv);
  } else if (version === NOTE_VERSION_DUAL) {
    return decryptDualEnvelope(data, recipientViewPriv, 'view');
  } else {
    throw new Error(`Unknown note encryption version: 0x${version.toString(16).padStart(2, '0')}`);
  }
}

/**
 * Decrypt a dual-envelope note using the spending private key.
 */
export function decryptNoteWithSpendKey(
  envelope: `0x${string}`,
  recipientSpendPriv: `0x${string}`,
): string {
  const data = hexToBytes(envelope);
  if (data.length < 1 || data[0] !== NOTE_VERSION_DUAL) {
    throw new Error('Not a dual-envelope note — use decryptNote with viewing key instead');
  }
  return decryptDualEnvelope(data, recipientSpendPriv, 'spend');
}

function decryptBaseline(data: Uint8Array, viewPriv: `0x${string}`): string {
  // Parse: [version(1)] [ephPubX(32)] [nonce(12)] [ciphertext(N)]
  const ephPubX = data.slice(1, 33);
  const nonce = data.slice(33, 45);
  const ciphertext = data.slice(45);

  // Reconstruct compressed public key (try 0x02 prefix)
  const ephPubCompressed = new Uint8Array(33);
  ephPubCompressed[0] = 0x02;
  ephPubCompressed.set(ephPubX, 1);

  // ECDH with recipient's viewing private key
  let sharedX: Uint8Array;
  try {
    const sharedCompressed = getSharedSecret(hexToBytes(viewPriv), ephPubCompressed);
    sharedX = sharedCompressed.slice(1);
  } catch {
    // Try 0x03 prefix if 0x02 failed (the x-coord might correspond to the odd y)
    ephPubCompressed[0] = 0x03;
    const sharedCompressed = getSharedSecret(hexToBytes(viewPriv), ephPubCompressed);
    sharedX = sharedCompressed.slice(1);
  }

  const symKey = deriveSymmetricKey(sharedX);
  const cipher = chacha20poly1305(symKey, nonce);
  const plaintext = cipher.decrypt(ciphertext);

  return new TextDecoder().decode(plaintext);
}

// ── Dual-envelope mode ──────────────────────────────────────────────────

/**
 * Encrypt a note in dual-envelope mode.
 * Both spendPub and viewPub holders can decrypt.
 */
export function encryptNoteDualEnvelope(
  plaintext: string,
  recipientViewPub: `0x${string}`,
  recipientSpendPub: `0x${string}`,
): { envelope: `0x${string}`; ephemeralPrivateKeys: { view: `0x${string}`; spend: `0x${string}` } } {
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate a random content encryption key (CEK)
  const cek = randomBytes(32);

  // Wrap CEK for view key path
  const viewWrap = wrapKeyForRecipient(cek, recipientViewPub);
  // Wrap CEK for spend key path
  const spendWrap = wrapKeyForRecipient(cek, recipientSpendPub);

  // Encrypt plaintext with CEK
  const contentNonce = randomBytes(12);
  const contentCipher = chacha20poly1305(cek, contentNonce);
  const ciphertext = contentCipher.encrypt(plaintextBytes);

  // Build envelope:
  // [version(1)]
  // [viewEphPubX(32)] [viewNonce(12)] [viewWrappedCEK(48)] = 92 bytes
  // [spendEphPubX(32)] [spendNonce(12)] [spendWrappedCEK(48)] = 92 bytes
  // [contentNonce(12)] [ciphertext(N)]
  const envelope = new Uint8Array(1 + 92 + 92 + 12 + ciphertext.length);
  let offset = 0;
  envelope[offset++] = NOTE_VERSION_DUAL;

  envelope.set(viewWrap.ephPubX, offset); offset += 32;
  envelope.set(viewWrap.nonce, offset); offset += 12;
  envelope.set(viewWrap.wrappedKey, offset); offset += 48;

  envelope.set(spendWrap.ephPubX, offset); offset += 32;
  envelope.set(spendWrap.nonce, offset); offset += 12;
  envelope.set(spendWrap.wrappedKey, offset); offset += 48;

  envelope.set(contentNonce, offset); offset += 12;
  envelope.set(ciphertext, offset);

  return {
    envelope: `0x${bytesToHex(envelope).replace(/^0x/, '')}` as `0x${string}`,
    ephemeralPrivateKeys: {
      view: viewWrap.ephPriv,
      spend: spendWrap.ephPriv,
    },
  };
}

function wrapKeyForRecipient(cek: Uint8Array, recipientPub: `0x${string}`): {
  ephPubX: Uint8Array;
  nonce: Uint8Array;
  wrappedKey: Uint8Array;
  ephPriv: `0x${string}`;
} {
  const ephPriv = utils.randomSecretKey();
  const ephPubCompressed = getPublicKey(ephPriv, true);
  const ephPubX = ephPubCompressed.slice(1);

  const sharedCompressed = getSharedSecret(ephPriv, hexToBytes(recipientPub));
  const sharedX = sharedCompressed.slice(1);
  const wrapKey = deriveSymmetricKey(sharedX);

  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(wrapKey, nonce);
  const wrappedKey = cipher.encrypt(cek);

  return {
    ephPubX,
    nonce,
    wrappedKey,
    ephPriv: `0x${bytesToHex(ephPriv).replace(/^0x/, '')}` as `0x${string}`,
  };
}

function decryptDualEnvelope(data: Uint8Array, privKey: `0x${string}`, keyPath: 'view' | 'spend'): string {
  // Parse header
  // [version(1)]
  // [viewEphPubX(32)] [viewNonce(12)] [viewWrappedCEK(48)] = offset 1..93
  // [spendEphPubX(32)] [spendNonce(12)] [spendWrappedCEK(48)] = offset 93..185
  // [contentNonce(12)] [ciphertext(N)] = offset 185..

  if (data.length < 197) {
    throw new Error('Dual-envelope note too short');
  }

  let wrapOffset: number;
  if (keyPath === 'view') {
    wrapOffset = 1;
  } else {
    wrapOffset = 93;
  }

  const ephPubX = data.slice(wrapOffset, wrapOffset + 32);
  const nonce = data.slice(wrapOffset + 32, wrapOffset + 44);
  const wrappedCEK = data.slice(wrapOffset + 44, wrapOffset + 92);

  // Reconstruct ephemeral compressed public key
  const ephPubCompressed = new Uint8Array(33);
  ephPubCompressed[0] = 0x02;
  ephPubCompressed.set(ephPubX, 1);

  let sharedX: Uint8Array;
  try {
    const shared = getSharedSecret(hexToBytes(privKey), ephPubCompressed);
    sharedX = shared.slice(1);
  } catch {
    ephPubCompressed[0] = 0x03;
    const shared = getSharedSecret(hexToBytes(privKey), ephPubCompressed);
    sharedX = shared.slice(1);
  }

  const wrapKey = deriveSymmetricKey(sharedX);
  const wrapCipher = chacha20poly1305(wrapKey, nonce);
  const cek = wrapCipher.decrypt(wrappedCEK);

  // Decrypt content
  const contentNonce = data.slice(185, 197);
  const ciphertext = data.slice(197);
  const contentCipher = chacha20poly1305(cek, contentNonce);
  const plaintext = contentCipher.decrypt(ciphertext);

  return new TextDecoder().decode(plaintext);
}
