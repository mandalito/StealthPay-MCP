import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..');

/**
 * Recursively collect all files matching given extensions under a directory.
 */
function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files.push(...collectFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

// Patterns that look like private keys (32-byte hex strings)
// Matches: 0x followed by exactly 64 hex characters
// Excludes: well-known contract addresses (40 hex chars), common test/zero values
const PRIVATE_KEY_PATTERN = /0x[0-9a-fA-F]{64}\b/g;

// Known safe patterns: zero-padded addresses, well-known constants, placeholder patterns
const SAFE_PATTERNS = [
  /^0x0{64}$/,                   // all zeros
  /^0x[fF]{64}$/,                // all F's
  /^0x0{24}[0-9a-fA-F]{40}$/,   // zero-padded 20-byte address in 32-byte field
  /^0x1{64}$/,                   // all 1's (common test placeholder)
  /^0x[aAbBcCdDeE]{64}$/,       // repeated single-letter placeholders
];

function isSafeValue(value: string): boolean {
  return SAFE_PATTERNS.some(p => p.test(value));
}

describe('No private-key-like strings in docs/examples', () => {
  const dirs = [
    join(PROJECT_ROOT, 'docs'),
    join(PROJECT_ROOT, 'examples'),
  ].filter(d => { try { statSync(d); return true; } catch { return false; } });

  const files = dirs.flatMap(d => collectFiles(d, ['.md', '.ts', '.js', '.json', '.yaml', '.yml']));

  if (files.length === 0) {
    it('has docs/examples to scan', () => {
      // If no files, pass — nothing to check
      expect(true).toBe(true);
    });
    return;
  }

  for (const file of files) {
    const rel = relative(PROJECT_ROOT, file);

    it(`${rel} contains no private-key-like hex strings`, () => {
      const content = readFileSync(file, 'utf-8');
      const matches = [...content.matchAll(PRIVATE_KEY_PATTERN)]
        .map(m => m[0])
        .filter(v => !isSafeValue(v));

      if (matches.length > 0) {
        const unique = [...new Set(matches)];
        const preview = unique.slice(0, 3).map(m => `${m.slice(0, 10)}...${m.slice(-4)}`);
        expect.fail(
          `Found ${matches.length} private-key-like string(s) in ${rel}: ${preview.join(', ')}. ` +
          `Use placeholder values or env var references instead.`
        );
      }
    });
  }
});
