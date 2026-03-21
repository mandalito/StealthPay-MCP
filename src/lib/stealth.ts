/**
 * Stealth address operations — implements ERC-5564 scheme 1 (secp256k1).
 *
 * Algorithm (from the ScopeLift reference implementation):
 * 1. Parse stealth meta-address into spending + viewing public keys
 * 2. Generate ephemeral keypair
 * 3. Compute shared secret via ECDH(ephemeral_priv, viewing_pub)
 * 4. Hash shared secret with keccak256
 * 5. Derive stealth public key: spending_pub + point(hashed_secret)
 * 6. Convert stealth public key to Ethereum address
 */

import {
  Point,
  getPublicKey,
  getSharedSecret,
  etc,
  utils,
} from '@noble/secp256k1';
import {
  bytesToHex,
  hexToBytes,
  keccak256,
  publicKeyToAddress,
} from 'viem/utils';

export interface StealthAddressResult {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
}

/**
 * Generate a one-time stealth address from a recipient's stealth meta-address.
 *
 * @param stealthMetaAddress - The stealth meta-address (0x-prefixed hex: spending_pub ++ viewing_pub)
 * @returns The stealth address, ephemeral public key, and view tag
 */
export function generateStealthAddress(
  stealthMetaAddress: string
): StealthAddressResult {
  const { spendingPubKey, viewingPubKey } = parseStealthMetaAddress(stealthMetaAddress);

  // Generate ephemeral keypair
  const ephemeralPrivKey = utils.randomSecretKey();
  const ephemeralPubKey = getPublicKey(ephemeralPrivKey, true); // compressed

  // Compute shared secret: ECDH(ephemeral_priv, viewing_pub)
  // Extract x-coordinate only (drop the 0x02/0x03 prefix byte) per ERC-5564
  const sharedSecretCompressed = getSharedSecret(ephemeralPrivKey, viewingPubKey);
  const sharedSecretX = sharedSecretCompressed.slice(1); // 32 bytes: x-coordinate only

  // Hash the shared secret x-coordinate
  const hashedSecret = keccak256(sharedSecretX);

  // Extract view tag (most significant byte of hashed secret)
  const viewTag = `0x${hashedSecret.slice(2, 4)}` as `0x${string}`;

  // Derive stealth public key: spending_pub + G * hashed_secret
  const hashedSecretScalar = etc.bytesToNumberBE(hexToBytes(hashedSecret));
  const hashedSecretPoint = Point.BASE.multiply(hashedSecretScalar);
  const spendingPoint = Point.fromBytes(spendingPubKey);
  const stealthPubKey = spendingPoint.add(hashedSecretPoint).toBytes(false); // uncompressed

  // Convert to Ethereum address
  const stealthAddress = publicKeyToAddress(bytesToHex(stealthPubKey));

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPubKey) as `0x${string}`,
    viewTag,
  };
}

/**
 * Check if a stealth address announcement is intended for a given user.
 */
export function checkStealthAddress(params: {
  ephemeralPublicKey: `0x${string}`;
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  userStealthAddress: `0x${string}`;
  viewTag: `0x${string}`;
}): boolean {
  // Recompute the shared secret from the recipient's side
  // Extract x-coordinate only (drop the prefix byte) per ERC-5564
  const sharedSecretCompressed = getSharedSecret(
    hexToBytes(params.viewingPrivateKey),
    hexToBytes(params.ephemeralPublicKey)
  );
  const sharedSecretX = sharedSecretCompressed.slice(1); // 32 bytes: x-coordinate only

  const hashedSecret = keccak256(sharedSecretX);

  // Quick filter: check view tag first
  const computedViewTag = `0x${hashedSecret.slice(2, 4)}`;
  if (computedViewTag !== params.viewTag) return false;

  // Derive the expected stealth address
  const hashedSecretScalar = etc.bytesToNumberBE(hexToBytes(hashedSecret));
  const hashedSecretPoint = Point.BASE.multiply(hashedSecretScalar);
  const spendingPoint = Point.fromHex(params.spendingPublicKey.slice(2));
  const stealthPubKey = spendingPoint.add(hashedSecretPoint).toBytes(false);

  const derivedAddress = publicKeyToAddress(bytesToHex(stealthPubKey));

  return derivedAddress.toLowerCase() === params.userStealthAddress.toLowerCase();
}

// secp256k1 curve order
const CURVE_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

export interface DerivedStealthKey {
  stealthPrivateKey: `0x${string}`;
  stealthAddress: `0x${string}`;
}

/**
 * Derive the private key for a stealth address.
 *
 * stealth_priv = (spend_priv + keccak256(ECDH(view_priv, eph_pub).x)) mod n
 */
export function deriveStealthPrivateKey(params: {
  spendingPrivateKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  expectedAddress?: `0x${string}`;
}): DerivedStealthKey {
  // Compute shared secret (same as check path)
  const sharedSecretCompressed = getSharedSecret(
    hexToBytes(params.viewingPrivateKey),
    hexToBytes(params.ephemeralPublicKey)
  );
  const sharedSecretX = sharedSecretCompressed.slice(1);
  const hashedSecret = keccak256(sharedSecretX);

  // Scalar addition mod curve order
  const hashedSecretScalar = etc.bytesToNumberBE(hexToBytes(hashedSecret));
  const spendScalar = etc.bytesToNumberBE(hexToBytes(params.spendingPrivateKey));
  const stealthScalar = (spendScalar + hashedSecretScalar) % CURVE_ORDER;

  // Convert back to 32-byte hex
  const stealthPrivBytes = etc.numberToBytesBE(stealthScalar);
  const stealthPrivateKey = bytesToHex(stealthPrivBytes) as `0x${string}`;

  // Derive the address from the stealth private key
  const stealthPubKey = getPublicKey(stealthPrivBytes, false); // uncompressed
  const stealthAddress = publicKeyToAddress(bytesToHex(stealthPubKey));

  if (params.expectedAddress &&
      stealthAddress.toLowerCase() !== params.expectedAddress.toLowerCase()) {
    throw new Error(
      `Derived address ${stealthAddress} does not match expected ${params.expectedAddress}`
    );
  }

  return { stealthPrivateKey, stealthAddress };
}

/**
 * Parse a stealth meta-address into spending and viewing public keys.
 * Format: 0x + spending_pub_key (33 bytes compressed) + viewing_pub_key (33 bytes compressed)
 * If only one key is provided, it's used for both spending and viewing.
 */
function parseStealthMetaAddress(metaAddress: string): {
  spendingPubKey: Uint8Array;
  viewingPubKey: Uint8Array;
} {
  // Strip URI prefix if present (e.g., "st:eth:0x...")
  let hex = metaAddress;
  if (hex.startsWith('st:')) {
    const parts = hex.split(':');
    if (parts.length < 3 || !parts[2]) {
      throw new Error(
        `Invalid stealth meta-address URI: expected "st:<chain>:0x<keys>", got "${metaAddress}"`
      );
    }
    hex = parts[2];
  }

  // Remove 0x prefix
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Each compressed public key is 33 bytes = 66 hex chars
  if (clean.length === 66) {
    const key = Point.fromHex(clean).toBytes(true);
    return { spendingPubKey: key, viewingPubKey: key };
  }

  if (clean.length === 132) {
    const spendingPubKey = Point.fromHex(clean.slice(0, 66)).toBytes(true);
    const viewingPubKey = Point.fromHex(clean.slice(66)).toBytes(true);
    return { spendingPubKey, viewingPubKey };
  }

  throw new Error(
    `Invalid stealth meta-address: expected 66 or 132 hex chars (after 0x), got ${clean.length}`
  );
}
