import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type PaymentProfile,
  PROFILE_DEFAULTS,
  STEALTH_POLICIES,
  NOTE_POLICIES,
  NOTE_PRIVACIES,
  isValidStealthPolicy,
  isValidNotePolicy,
  isValidNotePrivacy,
} from '../../src/lib/profile.js';

const schemaPath = join(import.meta.dirname, '..', '..', 'schemas', 'payment-profile.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

/**
 * Lightweight JSON Schema validation for the payment profile.
 * We validate key structural properties rather than pulling in a full JSON Schema validator.
 */
describe('Payment profile JSON Schema', () => {
  it('schema file exists and is valid JSON', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.title).toBe('StealthPay Payment Profile');
  });

  it('schema declares all PaymentProfile fields', () => {
    const schemaFields = Object.keys(schema.properties);
    const profileFields: (keyof PaymentProfile)[] = [
      'ensName', 'address', 'avatar', 'description',
      'preferredChains', 'preferredAssets', 'preferredChain', 'preferredToken',
      'stealthMetaAddress', 'stealthPolicy', 'stealthSchemeIds',
      'notePolicy', 'noteMaxBytes', 'notePrivacy',
    ];

    for (const field of profileFields) {
      expect(schemaFields, `missing field: ${field}`).toContain(field);
    }
  });

  it('stealthPolicy enum matches TypeScript type', () => {
    const schemaEnum = schema.properties.stealthPolicy.enum;
    expect(schemaEnum.sort()).toEqual([...STEALTH_POLICIES].sort());
  });

  it('notePolicy enum matches TypeScript type', () => {
    const schemaEnum = schema.properties.notePolicy.enum;
    expect(schemaEnum.sort()).toEqual([...NOTE_POLICIES].sort());
  });

  it('notePrivacy enum matches TypeScript type', () => {
    const schemaEnum = schema.properties.notePrivacy.enum;
    expect(schemaEnum.sort()).toEqual([...NOTE_PRIVACIES].sort());
  });

  it('default values match PROFILE_DEFAULTS', () => {
    expect(schema.properties.stealthPolicy.default).toBe(PROFILE_DEFAULTS.stealthPolicy);
    expect(schema.properties.notePolicy.default).toBe(PROFILE_DEFAULTS.notePolicy);
    expect(schema.properties.noteMaxBytes.default).toBe(PROFILE_DEFAULTS.noteMaxBytes);
    expect(schema.properties.notePrivacy.default).toBe(PROFILE_DEFAULTS.notePrivacy);
  });

  it('preferredChains items have CAIP-2 pattern', () => {
    const pattern = schema.properties.preferredChains.items.pattern;
    expect(pattern).toBeDefined();
    const re = new RegExp(pattern);
    expect(re.test('eip155:1')).toBe(true);
    expect(re.test('eip155:8453')).toBe(true);
    expect(re.test('not-caip')).toBe(false);
  });
});

describe('Profile validation functions', () => {
  it('isValidStealthPolicy accepts valid values', () => {
    for (const v of STEALTH_POLICIES) {
      expect(isValidStealthPolicy(v)).toBe(true);
    }
    expect(isValidStealthPolicy('invalid')).toBe(false);
    expect(isValidStealthPolicy('')).toBe(false);
  });

  it('isValidNotePolicy accepts valid values', () => {
    for (const v of NOTE_POLICIES) {
      expect(isValidNotePolicy(v)).toBe(true);
    }
    expect(isValidNotePolicy('invalid')).toBe(false);
  });

  it('isValidNotePrivacy accepts valid values', () => {
    for (const v of NOTE_PRIVACIES) {
      expect(isValidNotePrivacy(v)).toBe(true);
    }
    expect(isValidNotePrivacy('invalid')).toBe(false);
  });
});
