#!/usr/bin/env npx tsx
/**
 * End-to-end test using a real ENS name on Sepolia.
 *
 * Full flow: ENS lookup → stealth address → send ETH → announce → scan → derive key
 *
 * Prerequisites:
 *   - .env with TEST_PRIVATE_KEY, RECIPIENT_* keys, ENS_CHAIN=sepolia
 *   - stealthpay.eth registered on Sepolia with stealth-meta-address text record
 *
 * Usage:
 *   npx tsx test/ens-e2e.ts
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { getPaymentProfile, getStealthMetaAddress } from '../src/lib/ens.js';
import { generateStealthAddress, deriveStealthPrivateKey } from '../src/lib/stealth.js';
import { scanAnnouncements } from '../src/lib/scanner.js';
import {
  ERC5564_ANNOUNCER,
  ERC5564_ANNOUNCER_ABI,
  SCHEME_ID,
} from '../src/config.js';

// ── Config ──────────────────────────────────────────────────────────────────

const ENS_NAME = process.env.TEST_ENS_NAME ?? 'stealthpay.eth';
const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as `0x${string}`;
const RECIPIENT_SPENDING_PRIV = process.env.RECIPIENT_SPENDING_PRIVATE_KEY as `0x${string}`;
const RECIPIENT_VIEWING_PRIV = process.env.RECIPIENT_VIEWING_PRIVATE_KEY as `0x${string}`;
const RECIPIENT_SPENDING_PUB = process.env.RECIPIENT_SPENDING_PUBLIC_KEY as `0x${string}`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function step(n: number, msg: string) {
  console.log(`\n── Step ${n}: ${msg} ${'─'.repeat(Math.max(0, 60 - msg.length))}`);
}
function ok(msg: string) { console.log(`   ✓ ${msg}`); }
function warn(msg: string) { console.log(`   ⚠ ${msg}`); }
function fail(msg: string) { console.error(`   ✗ ${msg}`); process.exit(1); }

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     StealthPay MCP — ENS End-to-End (Sepolia)              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (!PRIVATE_KEY || !RECIPIENT_SPENDING_PRIV || !RECIPIENT_VIEWING_PRIV || !RECIPIENT_SPENDING_PUB) {
    fail('Missing required env vars. Check .env file.');
  }

  // ── Step 1: Resolve ENS name ──────────────────────────────────────────

  step(1, `Resolve ENS name: ${ENS_NAME}`);

  const profile = await getPaymentProfile(ENS_NAME);
  ok(`Name: ${profile.ensName}`);
  ok(`Address: ${profile.address}`);
  ok(`Stealth meta-address: ${profile.stealthMetaAddress ? profile.stealthMetaAddress.slice(0, 30) + '...' : 'NOT SET'}`);

  if (!profile.stealthMetaAddress) {
    fail('No stealth meta-address found. Set the text record on your ENS name.');
  }

  // ── Step 2: Generate stealth address from ENS ─────────────────────────

  step(2, 'Generate stealth address from ENS profile');

  const metaAddress = await getStealthMetaAddress(ENS_NAME);
  if (!metaAddress) fail('Could not fetch stealth meta-address');

  const stealth = generateStealthAddress(metaAddress);
  ok(`Stealth address: ${stealth.stealthAddress}`);
  ok(`Ephemeral pubkey: ${stealth.ephemeralPublicKey.slice(0, 20)}...`);
  ok(`View tag: ${stealth.viewTag}`);

  // ── Step 3: Send ETH to stealth address ───────────────────────────────

  step(3, 'Send ETH to stealth address (Sepolia)');

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: sepolia, transport: http() });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });

  const balance = await publicClient.getBalance({ address: account.address });
  ok(`Sender: ${account.address}`);
  ok(`Balance: ${formatEther(balance)} ETH`);

  if (balance < parseEther('0.0005')) {
    fail(`Balance too low (${formatEther(balance)} ETH)`);
  }

  const txHash = await walletClient.sendTransaction({
    to: stealth.stealthAddress,
    value: parseEther('0.000001'),
  });
  ok(`Transfer tx: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  ok(`Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
  ok(`Explorer: https://sepolia.etherscan.io/tx/${txHash}`);

  // ── Step 4: Announce via ERC-5564 ─────────────────────────────────────

  step(4, 'Announce via ERC-5564 Announcer');

  const metadata = stealth.viewTag as `0x${string}`;
  const announceTx = await walletClient.writeContract({
    address: ERC5564_ANNOUNCER,
    abi: ERC5564_ANNOUNCER_ABI,
    functionName: 'announce',
    args: [SCHEME_ID, stealth.stealthAddress, stealth.ephemeralPublicKey, metadata],
  });
  ok(`Announce tx: ${announceTx}`);

  const announceReceipt = await publicClient.waitForTransactionReceipt({ hash: announceTx });
  ok(`Confirmed in block ${announceReceipt.blockNumber} (status: ${announceReceipt.status})`);
  ok(`Explorer: https://sepolia.etherscan.io/tx/${announceTx}`);

  // ── Step 5: Scan as recipient ─────────────────────────────────────────

  step(5, 'Scan announcements (recipient discovers payment)');

  const payments = await scanAnnouncements({
    viewingPrivateKey: RECIPIENT_VIEWING_PRIV,
    spendingPublicKey: RECIPIENT_SPENDING_PUB,
    chain: 'sepolia',
    fromBlock: announceReceipt.blockNumber,
    toBlock: announceReceipt.blockNumber,
  });

  if (payments.length === 0) fail('Scanner found no payments');

  const found = payments.find(
    (p) => p.stealthAddress.toLowerCase() === stealth.stealthAddress.toLowerCase()
  );
  if (!found) fail('Scanner did not find our payment');

  ok(`Discovered payment at: ${found.stealthAddress}`);
  ok(`Block: ${found.blockNumber}, Tx: ${found.txHash}`);

  // ── Step 6: Derive stealth private key ────────────────────────────────

  step(6, 'Derive stealth private key');

  const derived = deriveStealthPrivateKey({
    spendingPrivateKey: RECIPIENT_SPENDING_PRIV,
    viewingPrivateKey: RECIPIENT_VIEWING_PRIV,
    ephemeralPublicKey: found.ephemeralPublicKey,
    expectedAddress: stealth.stealthAddress,
  });

  ok(`Derived address: ${derived.stealthAddress}`);

  const derivedAccount = privateKeyToAccount(derived.stealthPrivateKey);
  if (derivedAccount.address.toLowerCase() !== stealth.stealthAddress.toLowerCase()) {
    fail('Derived key does not match stealth address');
  }
  ok(`Recipient can control funds at ${derived.stealthAddress}`);

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Full ENS flow completed!                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`
  ENS name:         ${ENS_NAME}
  Resolved address:  ${profile.address}
  Stealth address:   ${stealth.stealthAddress}
  Transfer tx:       ${txHash}
  Announce tx:       ${announceTx}
  Recipient derived: ✓ (key matches stealth address)
  `);
}

main().catch((e) => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
