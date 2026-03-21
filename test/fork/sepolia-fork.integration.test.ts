import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { createPublicClient, http, parseEther } from 'viem';
import { bytesToHex } from 'viem/utils';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { getPublicKey, utils } from '@noble/secp256k1';
import { generateStealthAddress } from '../../src/lib/stealth.js';
import { sendToStealth } from '../../src/lib/payments.js';
import { registerAndGetTool } from '../tools/mcp-tool-test-utils.js';
import { registerScanAnnouncements } from '../../src/tools/scan-announcements.js';
import { registerClaimStealthPayment } from '../../src/tools/claim-stealth-payment.js';

const LOCAL_RPC_URL = 'http://127.0.0.1:8545';
const ANVIL_PORT = '8545';
const ANVIL_CHAIN_ID = '11155111';
const DEFAULT_ANVIL_FUNDED_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`;

let anvil: ChildProcessWithoutNullStreams | null = null;
let forkReady = false;
let forkUnavailableReason: string | null = null;
let originalRpcUrl: string | undefined;
let originalEnsRpcUrl: string | undefined;
let originalRecipientSpendingPriv: string | undefined;
let originalRecipientSpendingPub: string | undefined;
let originalRecipientViewingPriv: string | undefined;
let originalRecipientViewingPub: string | undefined;

async function waitForRpcReady(timeoutMs = 60_000) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(LOCAL_RPC_URL),
  });

  const deadline = Date.now() + timeoutMs;
  let lastError = 'unknown error';
  while (Date.now() < deadline) {
    try {
      await client.getBlockNumber();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(500);
    }
  }
  throw new Error(`Timed out waiting for local fork RPC at ${LOCAL_RPC_URL}. Last error: ${lastError}`);
}

describe('Sepolia fork integration', () => {
  beforeAll(async () => {
    const forkUrl = process.env.SEPOLIA_FORK_URL || process.env.RPC_URL;
    if (!forkUrl) {
      throw new Error(
        'Missing fork upstream URL. Set SEPOLIA_FORK_URL (recommended) or RPC_URL before running `npm run test:fork`.'
      );
    }

    originalRpcUrl = process.env.RPC_URL;
    originalEnsRpcUrl = process.env.ENS_RPC_URL;
    originalRecipientSpendingPriv = process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
    originalRecipientSpendingPub = process.env.RECIPIENT_SPENDING_PUBLIC_KEY;
    originalRecipientViewingPriv = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
    originalRecipientViewingPub = process.env.RECIPIENT_VIEWING_PUBLIC_KEY;

    try {
      anvil = spawn(
        'anvil',
        [
          '--fork-url',
          forkUrl,
          '--port',
          ANVIL_PORT,
          '--host',
          '127.0.0.1',
          '--chain-id',
          ANVIL_CHAIN_ID,
          '--silent',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let startupStderr = '';
      anvil.stderr.on('data', (chunk) => {
        startupStderr += chunk.toString();
      });

      anvil.on('exit', (code, signal) => {
        if (code !== 0 && signal !== 'SIGTERM') {
          console.error(`anvil exited unexpectedly (code=${code}, signal=${signal})`);
          if (startupStderr) console.error(startupStderr);
        }
      });

      await waitForRpcReady();

      process.env.RPC_URL = LOCAL_RPC_URL;
      process.env.ENS_RPC_URL = LOCAL_RPC_URL;
      forkReady = true;
    } catch (error) {
      forkUnavailableReason = error instanceof Error ? error.message : String(error);
      if (process.env.FORK_REQUIRED === 'true') {
        throw error;
      }
      console.warn(`Skipping fork test setup: ${forkUnavailableReason}`);
    }
  }, 90_000);

  afterAll(async () => {
    process.env.RPC_URL = originalRpcUrl;
    process.env.ENS_RPC_URL = originalEnsRpcUrl;
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = originalRecipientSpendingPriv;
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = originalRecipientSpendingPub;
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = originalRecipientViewingPriv;
    process.env.RECIPIENT_VIEWING_PUBLIC_KEY = originalRecipientViewingPub;

    if (anvil && !anvil.killed) {
      anvil.kill('SIGTERM');
      await sleep(300);
    }
  });

  it('runs send -> scan -> claim on a local Sepolia fork', async () => {
    if (!forkReady) return;

    const senderPrivateKey =
      (process.env.FORK_SENDER_PRIVATE_KEY as `0x${string}` | undefined) || DEFAULT_ANVIL_FUNDED_KEY;
    const senderAccount = privateKeyToAccount(senderPrivateKey);

    const client = createPublicClient({
      chain: sepolia,
      transport: http(LOCAL_RPC_URL),
    });

    const senderBalance = await client.getBalance({ address: senderAccount.address });
    expect(senderBalance > parseEther('1')).toBe(true);

    // Build recipient stealth identity
    const spendingPriv = utils.randomSecretKey();
    const spendingPub = getPublicKey(spendingPriv, true);
    const viewingPriv = utils.randomSecretKey();
    const viewingPub = getPublicKey(viewingPriv, true);

    const spendingPrivateKey = bytesToHex(spendingPriv) as `0x${string}`;
    const spendingPublicKey = bytesToHex(spendingPub) as `0x${string}`;
    const viewingPrivateKey = bytesToHex(viewingPriv) as `0x${string}`;
    const viewingPublicKey = bytesToHex(viewingPub) as `0x${string}`;

    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = spendingPrivateKey;
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = spendingPublicKey;
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = viewingPrivateKey;
    process.env.RECIPIENT_VIEWING_PUBLIC_KEY = viewingPublicKey;

    const stealthMetaAddress =
      `st:eth:0x${spendingPublicKey.slice(2)}${viewingPublicKey.slice(2)}`;
    const stealth = generateStealthAddress(stealthMetaAddress);

    // Send a private payment + announcement on fork
    const send = await sendToStealth({
      to: stealth.stealthAddress,
      amount: '0.001',
      token: 'ETH',
      chain: 'sepolia',
      privateKey: senderPrivateKey,
      ephemeralPublicKey: stealth.ephemeralPublicKey,
      viewTag: stealth.viewTag,
    });

    expect(send.transferTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(send.announceTxHash).not.toBeNull();
    expect(send.announceFailed).toBeFalsy();

    const transferReceipt = await client.waitForTransactionReceipt({
      hash: send.transferTxHash as `0x${string}`,
    });
    expect(transferReceipt.status).toBe('success');

    const announceReceipt = await client.waitForTransactionReceipt({
      hash: send.announceTxHash as `0x${string}`,
    });
    expect(announceReceipt.status).toBe('success');

    // Scan through MCP tool handler (env-only key flow)
    const { handler: scanHandler } = registerAndGetTool(registerScanAnnouncements, 'scan-announcements');
    const fromBlock = announceReceipt.blockNumber > 20n ? announceReceipt.blockNumber - 20n : 0n;
    const scanResult = await scanHandler({
      chain: 'sepolia',
      fromBlock: fromBlock.toString(),
      toBlock: announceReceipt.blockNumber.toString(),
    });

    expect(scanResult.isError).toBeUndefined();
    expect(scanResult.content[0].text).toContain(stealth.stealthAddress);
    expect(scanResult.content[0].text).toContain(stealth.ephemeralPublicKey);

    // Claim through MCP tool handler (derive + withdraw server-side)
    const destinationAccount = privateKeyToAccount(bytesToHex(utils.randomSecretKey()) as `0x${string}`);
    const beforeBalance = await client.getBalance({ address: destinationAccount.address });

    const { handler: claimHandler } = registerAndGetTool(registerClaimStealthPayment, 'claim-stealth-payment');
    const claimResult = await claimHandler({
      ephemeralPublicKey: stealth.ephemeralPublicKey,
      to: destinationAccount.address,
      token: 'ETH',
      chain: 'sepolia',
    });

    expect(claimResult.isError).toBeUndefined();
    expect(claimResult.content[0].text).toContain('Stealth payment claimed successfully.');

    const afterBalance = await client.getBalance({ address: destinationAccount.address });
    expect(afterBalance > beforeBalance).toBe(true);
  }, 120_000);
});
