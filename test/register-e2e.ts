#!/usr/bin/env npx tsx
/**
 * End-to-end test: register an ENS name + set stealth keys + full payment flow.
 *
 * Usage:
 *   npx tsx test/register-e2e.ts [label]
 *   e.g. npx tsx test/register-e2e.ts stealthtest42
 */

import 'dotenv/config';
import { registerEnsName, registerStealthKeys } from '../src/lib/ens-register.js';
import { getPaymentProfile } from '../src/lib/ens.js';
import { generateStealthAddress, deriveStealthPrivateKey } from '../src/lib/stealth.js';

const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY ?? process.env.SENDER_PRIVATE_KEY;
const label = process.argv[2];

function step(n: number, msg: string) {
  console.log(`\n── Step ${n}: ${msg} ${'─'.repeat(Math.max(0, 60 - msg.length))}`);
}
function ok(msg: string) { console.log(`   ✓ ${msg}`); }
function fail(msg: string) { console.error(`   ✗ ${msg}`); process.exit(1); }

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  StealthPay MCP — ENS Registration + Stealth Keys E2E      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (!PRIVATE_KEY) fail('Set TEST_PRIVATE_KEY or SENDER_PRIVATE_KEY in .env');
  if (!label) fail('Usage: npx tsx test/register-e2e.ts <label>\n   e.g. npx tsx test/register-e2e.ts stealthtest42');

  const privateKey = (PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`) as `0x${string}`;

  // ── Step 1: Register ENS name ─────────────────────────────────────────

  step(1, `Register ${label}.eth on Sepolia`);

  const regResult = await registerEnsName(
    { label, privateKey, chain: 'sepolia' },
    (msg) => ok(msg),
  );
  ok(`Name: ${regResult.name}`);
  ok(`Owner: ${regResult.owner}`);
  ok(`Cost: ${regResult.cost}`);
  ok(`Commit tx: ${regResult.commitTxHash}`);
  ok(`Register tx: ${regResult.registerTxHash}`);

  // ── Step 2: Generate + set stealth keys ───────────────────────────────

  step(2, `Set stealth keys on ${regResult.name}`);

  const keysResult = await registerStealthKeys({
    name: regResult.name,
    privateKey,
    chain: 'sepolia',
  });
  ok(`Tx: ${keysResult.txHash}`);
  ok(`Meta-address: ${keysResult.stealthMetaAddress.slice(0, 30)}...`);
  ok(`Spending pub: ${keysResult.spendingPublicKey}`);
  ok(`Viewing pub:  ${keysResult.viewingPublicKey}`);

  // ── Step 3: Verify via ENS lookup ─────────────────────────────────────

  step(3, `Verify profile for ${regResult.name}`);

  const profile = await getPaymentProfile(regResult.name);
  ok(`Resolved address: ${profile.address}`);
  ok(`Stealth meta-address: ${profile.stealthMetaAddress ? 'found' : 'NOT FOUND'}`);

  if (!profile.stealthMetaAddress) {
    fail('Stealth meta-address not found after setting it');
  }

  // ── Step 4: Generate stealth address + verify round-trip ──────────────

  step(4, 'Generate stealth address + round-trip verification');

  const stealth = generateStealthAddress(profile.stealthMetaAddress);
  ok(`Stealth address: ${stealth.stealthAddress}`);

  const derived = deriveStealthPrivateKey({
    spendingPrivateKey: keysResult.spendingPrivateKey,
    viewingPrivateKey: keysResult.viewingPrivateKey,
    ephemeralPublicKey: stealth.ephemeralPublicKey,
    expectedAddress: stealth.stealthAddress,
  });
  ok(`Derived address matches: ${derived.stealthAddress}`);

  // ── Done ──────────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Registration + Stealth Keys complete!               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (process.env.DEBUG === 'true') {
    console.log(`
  SAVE THESE KEYS:
  Spending private key: ${keysResult.spendingPrivateKey}
  Viewing private key:  ${keysResult.viewingPrivateKey}
    `);
  } else {
    console.log(`\n  Keys generated. Set DEBUG=true to print them to stdout.`);
  }
}

main().catch((e) => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
