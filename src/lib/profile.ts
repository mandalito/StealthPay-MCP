/**
 * Payment profile schema — shared types, validation, and ENS key mappings.
 *
 * Implements the stealthpay.v1 namespaced profile keyset for ENS text records,
 * with CAIP-2/19 canonical identifiers and explicit stealth/note policies.
 */

// ── Stealth Policy ─────────────────────────────────────────────────────────

export type StealthPolicy = 'required' | 'preferred' | 'optional' | 'disabled';

export const STEALTH_POLICIES: readonly StealthPolicy[] = ['required', 'preferred', 'optional', 'disabled'];

export function isValidStealthPolicy(value: string): value is StealthPolicy {
  return (STEALTH_POLICIES as readonly string[]).includes(value);
}

// ── Note Policy ────────────────────────────────────────────────────────────

export type NotePolicy = 'required' | 'optional' | 'none';
export type NotePrivacy = 'plaintext' | 'encrypted' | 'hash_only';

export const NOTE_POLICIES: readonly NotePolicy[] = ['required', 'optional', 'none'];
export const NOTE_PRIVACIES: readonly NotePrivacy[] = ['plaintext', 'encrypted', 'hash_only'];

export function isValidNotePolicy(value: string): value is NotePolicy {
  return (NOTE_POLICIES as readonly string[]).includes(value);
}

export function isValidNotePrivacy(value: string): value is NotePrivacy {
  return (NOTE_PRIVACIES as readonly string[]).includes(value);
}

// ── Profile Shape ──────────────────────────────────────────────────────────

export interface PaymentProfile {
  ensName: string;
  address: string | null;
  avatar: string | null;
  description: string | null;

  // CAIP-normalized preferences
  preferredChains: string[];       // CAIP-2 IDs (e.g. "eip155:8453")
  preferredAssets: string[];       // CAIP-19 IDs (e.g. "eip155:8453/erc20:0x...")

  // Legacy-compatible friendly values (derived from CAIP or legacy keys)
  preferredChain: string | null;   // friendly name (e.g. "base")
  preferredToken: string | null;   // symbol (e.g. "USDC")

  // Stealth
  stealthMetaAddress: string | null;
  stealthPolicy: StealthPolicy;
  stealthSchemeIds: number[];

  // Note
  notePolicy: NotePolicy;
  noteMaxBytes: number;
  notePrivacy: NotePrivacy;
}

// ── ENS Key Mappings ───────────────────────────────────────────────────────

/** Namespaced v1 keys → profile field mapping */
export const V1_ENS_KEYS = {
  version:          'stealthpay.v1.profile_version',
  preferredChains:  'stealthpay.v1.preferred_chains',
  preferredAssets:  'stealthpay.v1.preferred_assets',
  stealthPolicy:    'stealthpay.v1.stealth_policy',
  stealthSchemeIds: 'stealthpay.v1.stealth_scheme_ids',
  notePolicy:       'stealthpay.v1.note_policy',
  noteMaxBytes:     'stealthpay.v1.note_max_bytes',
  notePrivacy:      'stealthpay.v1.note_privacy',
} as const;

/** Legacy keys still used by current implementation */
export const LEGACY_ENS_KEYS = {
  chain:              'chain',
  token:              'token',
  description:        'description',
  stealthMetaAddress: 'stealth-meta-address',
  avatar:             'avatar',
} as const;

// ── Defaults ───────────────────────────────────────────────────────────────

export const PROFILE_DEFAULTS = {
  stealthPolicy: 'preferred' as StealthPolicy,
  stealthSchemeIds: [1],
  notePolicy: 'optional' as NotePolicy,
  noteMaxBytes: 140,
  notePrivacy: 'plaintext' as NotePrivacy,
} as const;
