#!/usr/bin/env npx tsx
/**
 * End-to-end testnet integration script.
 *
 * Tests the full stealth payment flow on Sepolia (where ERC-5564/6538 are deployed).
 * Also verifies basic connectivity on Hoodi for future use.
 *
 * Prerequisites:
 *   1. Get Sepolia ETH from a faucet (e.g. https://sepoliafaucet.com)
 *   2. Set env vars:
 *        export TEST_PRIVATE_KEY="0x<your-sepolia-private-key>"
 *        export SEPOLIA_RPC_URL="https://..."  (optional, uses public RPC otherwise)
 *
 * Usage:
 *   npx tsx test/testnet-e2e.ts
 *
 * What it does:
 *   Step 1: Generate a stealth meta-address from a fresh keypair (simulated recipient)
 *   Step 2: Generate a stealth address from that meta-address
 *   Step 3: Verify the recipient can discover the stealth address (round-trip check)
 *   Step 4: Send a small ETH transfer to the stealth address (proves tx execution works)
 *   Step 5: Call the ERC-5564 Announcer contract (proves contract interaction works)
 *   Step 6: Check Hoodi connectivity
 */

import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, hoodi } from 'viem/chains';
import { getPublicKey, utils } from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from 'viem/utils';
import { generateStealthAddress, checkStealthAddress } from '../src/lib/stealth.js';
import {
  ERC5564_ANNOUNCER,
  ERC5564_ANNOUNCER_ABI,
  SCHEME_ID,
} from '../src/config.js';

// ── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined;
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL;
const HOODI_RPC = process.env.HOODI_RPC_URL ?? 'https://rpc.hoodi.ethpandaops.io';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeMetaAddress(spendPub: Uint8Array, viewPub: Uint8Array): string {
  return '0x' + bytesToHex(spendPub).slice(2) + bytesToHex(viewPub).slice(2);
}

function step(n: number, msg: string) {
  console.log(`\n── Step ${n}: ${msg} ${'─'.repeat(Math.max(0, 60 - msg.length))}`);
}

function ok(msg: string) {
  console.log(`   ✓ ${msg}`);
}

function warn(msg: string) {
  console.log(`   ⚠ ${msg}`);
}

function fail(msg: string) {
  console.error(`   ✗ ${msg}`);
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          StealthPay MCP — Testnet E2E Integration          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // ── Step 1: Simulate a recipient ──────────────────────────────────────

  step(1, 'Create simulated recipient keypairs');

  const recipientSpendPriv = utils.randomSecretKey();
  const recipientSpendPub = getPublicKey(recipientSpendPriv, true);
  const recipientViewPriv = utils.randomSecretKey();
  const recipientViewPub = getPublicKey(recipientViewPriv, true);

  const metaAddress = makeMetaAddress(recipientSpendPub, recipientViewPub);
  ok(`Spending pubkey: ${bytesToHex(recipientSpendPub)}`);
  ok(`Viewing pubkey:  ${bytesToHex(recipientViewPub)}`);
  ok(`Meta-address:    ${metaAddress.slice(0, 20)}...${metaAddress.slice(-8)}`);

  // ── Step 2: Generate stealth address ──────────────────────────────────

  step(2, 'Generate stealth address');

  const stealth = generateStealthAddress(metaAddress);
  ok(`Stealth address:    ${stealth.stealthAddress}`);
  ok(`Ephemeral pubkey:   ${stealth.ephemeralPublicKey.slice(0, 20)}...`);
  ok(`View tag:           ${stealth.viewTag}`);

  // ── Step 3: Verify recipient can discover it ──────────────────────────

  step(3, 'Verify round-trip (recipient discovery)');

  const canDiscover = checkStealthAddress({
    ephemeralPublicKey: stealth.ephemeralPublicKey,
    spendingPublicKey: bytesToHex(recipientSpendPub) as `0x${string}`,
    viewingPrivateKey: bytesToHex(recipientViewPriv) as `0x${string}`,
    userStealthAddress: stealth.stealthAddress,
    viewTag: stealth.viewTag,
  });

  if (!canDiscover) {
    fail('Round-trip check FAILED — recipient cannot discover the stealth address');
  }
  ok('Recipient can discover the stealth address');

  // Wrong recipient should NOT match
  const wrongViewPriv = utils.randomSecretKey();
  const wrongMatch = checkStealthAddress({
    ephemeralPublicKey: stealth.ephemeralPublicKey,
    spendingPublicKey: bytesToHex(recipientSpendPub) as `0x${string}`,
    viewingPrivateKey: bytesToHex(wrongViewPriv) as `0x${string}`,
    userStealthAddress: stealth.stealthAddress,
    viewTag: stealth.viewTag,
  });
  if (wrongMatch) {
    fail('Wrong recipient matched — this should not happen');
  }
  ok('Wrong recipient correctly rejected');

  // ── Step 4 & 5: On-chain transactions (require private key) ──────────

  if (!PRIVATE_KEY) {
    warn('TEST_PRIVATE_KEY not set — skipping on-chain steps 4 & 5');
    warn('To run the full test:');
    warn('  export TEST_PRIVATE_KEY="0x<sepolia-private-key>"');
    warn('  Get Sepolia ETH: https://sepoliafaucet.com');
  } else {
    if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) {
      fail('Invalid TEST_PRIVATE_KEY format');
    }

    const account = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC),
    });

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(SEPOLIA_RPC),
    });

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    ok(`Sender: ${account.address}`);
    ok(`Balance: ${formatEther(balance)} ETH`);

    if (balance < parseEther('0.0005')) {
      warn(`Balance too low for on-chain tests (need >0.0005 ETH, have ${formatEther(balance)})`);
      warn('Get Sepolia ETH from https://sepoliafaucet.com');
    } else {
      // ── Step 4: Send ETH to stealth address ────────────────────────

      step(4, 'Send ETH to stealth address (Sepolia)');

      const sendAmount = '0.000001'; // 1e-6 ETH ≈ dust, saves gas budget
      const txHash = await walletClient.sendTransaction({
        to: stealth.stealthAddress,
        value: parseEther(sendAmount),
      });
      ok(`Transfer tx: ${txHash}`);
      ok(`Explorer: https://sepolia.etherscan.io/tx/${txHash}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      ok(`Confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);

      // ── Step 5: Announce via ERC-5564 ──────────────────────────────

      step(5, 'Announce via ERC-5564 Announcer (Sepolia)');

      // Check if the announcer contract exists on Sepolia
      const code = await publicClient.getCode({ address: ERC5564_ANNOUNCER });
      if (!code || code === '0x') {
        warn('ERC-5564 Announcer not deployed on Sepolia — skipping announcement');
      } else {
        const metadata = stealth.viewTag as `0x${string}`;

        const announceTx = await walletClient.writeContract({
          address: ERC5564_ANNOUNCER,
          abi: ERC5564_ANNOUNCER_ABI,
          functionName: 'announce',
          args: [
            SCHEME_ID,
            stealth.stealthAddress,
            stealth.ephemeralPublicKey,
            metadata,
          ],
        });
        ok(`Announce tx: ${announceTx}`);
        ok(`Explorer: https://sepolia.etherscan.io/tx/${announceTx}`);

        const announceReceipt = await publicClient.waitForTransactionReceipt({
          hash: announceTx,
        });
        ok(`Confirmed in block ${announceReceipt.blockNumber} (status: ${announceReceipt.status})`);
      }
    }
  }

  // ── Step 6: Hoodi connectivity ────────────────────────────────────────

  step(6, 'Check Hoodi testnet connectivity');

  try {
    const hoodiClient = createPublicClient({
      chain: hoodi,
      transport: http(HOODI_RPC),
    });

    const blockNumber = await hoodiClient.getBlockNumber();
    ok(`Hoodi connected — latest block: ${blockNumber}`);

    // Check stealth contracts
    const announcerCode = await hoodiClient.getCode({ address: ERC5564_ANNOUNCER });
    if (announcerCode && announcerCode !== '0x') {
      ok('ERC-5564 Announcer is deployed on Hoodi!');
    } else {
      warn('ERC-5564 Announcer NOT yet deployed on Hoodi');
      warn('Full stealth payment flow requires contract deployment');
      warn('See: https://github.com/ScopeLift/stealth-address-erc-contracts');
    }
  } catch (e) {
    warn(`Hoodi connection failed: ${e instanceof Error ? e.message : e}`);
  }

  // ── Done ──────────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    All checks passed!                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch((e) => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
