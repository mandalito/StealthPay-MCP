# Privacy and Stealth Addresses

## Current Implementation

StealthPay uses ERC-5564-style stealth addressing logic implemented in `src/lib/stealth.ts`.

## Privacy Properties

- each payment can target a fresh stealth address
- address reuse is reduced
- recipient can discover payments using viewing key + announcement data
- payment notes can be encrypted so only the recipient can read them

## Recipient Recovery Model

- scan announcements using env-configured recipient keys
- claim with `claim-stealth-payment` (derive + withdraw server-side)

## Encrypted Notes

When a recipient sets `notePrivacy: 'encrypted'` in their payment profile, memos are encrypted before being stored in the ERC-5564 announcement metadata.

### Baseline mode (v1)

- Sender generates an ephemeral keypair
- ECDH with recipient's viewing public key produces a shared secret
- HKDF-SHA256 derives a symmetric key from the shared secret
- ChaCha20-Poly1305 encrypts the plaintext memo
- Envelope format: `[version(1)] [ephPubX(32)] [nonce(12)] [ciphertext+tag(N)]`
- Sender retains ephemeral private key to decrypt their own sent notes

### Dual-envelope mode (v2, optional)

- A random content encryption key (CEK) is generated
- CEK is wrapped separately for both the viewing key and spending key paths
- Either `viewPriv` or `spendPriv` can unwrap the CEK and decrypt the note
- Envelope includes two key-wrap blocks + encrypted content

### Hash-only mode

- When `notePrivacy: 'hash_only'`, only a keccak256 hash of the memo is stored on-chain
- The original plaintext must be communicated out-of-band

Implementation: `src/lib/note-encryption.ts`

## Known Limitations

- stealth addresses need ETH for gas to withdraw
- metadata decoding assumes project-specific layout
- cross-sender metadata interoperability is limited
- encrypted note decryption requires the recipient's viewing private key (or spending key for dual-envelope)
