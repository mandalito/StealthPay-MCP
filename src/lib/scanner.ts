/**
 * Scan ERC-5564 Announcement events to discover stealth payments for a recipient.
 */

import { createPublicClient, http, parseAbiItem } from 'viem';
import { hexToBytes, keccak256 } from 'viem/utils';
import { getSharedSecret } from '@noble/secp256k1';
import { checkStealthAddress } from './stealth.js';
import {
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN,
  ERC5564_ANNOUNCER,
  SCHEME_ID,
} from '../config.js';

export interface StealthPayment {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
  token: `0x${string}` | null;
  amount: bigint | null;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

export interface ScanParams {
  viewingPrivateKey: `0x${string}`;
  spendingPublicKey: `0x${string}`;
  chain?: string;
  fromBlock?: bigint;
  toBlock?: bigint;
  chunkSize?: bigint;
}

// Announcement event signature for getLogs
const ANNOUNCEMENT_EVENT = parseAbiItem(
  'event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)'
);

const DEFAULT_CHUNK_SIZE = 5000n;
const DEFAULT_LOOKBACK = 50_000n;

/**
 * Scan for stealth payments addressed to a recipient.
 */
export async function scanAnnouncements(params: ScanParams): Promise<StealthPayment[]> {
  const chainName = params.chain ?? DEFAULT_CHAIN;
  const chain = SUPPORTED_CHAINS[chainName];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }

  const rpcUrl = process.env.RPC_URL;
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const latestBlock = await publicClient.getBlockNumber();
  const toBlock = params.toBlock ?? latestBlock;
  const fromBlock = params.fromBlock ?? (toBlock > DEFAULT_LOOKBACK ? toBlock - DEFAULT_LOOKBACK : 0n);
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK_SIZE;

  const results: StealthPayment[] = [];

  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = start + chunkSize - 1n > toBlock ? toBlock : start + chunkSize - 1n;

    let logs;
    try {
      logs = await publicClient.getLogs({
        address: ERC5564_ANNOUNCER,
        event: ANNOUNCEMENT_EVENT,
        args: { schemeId: SCHEME_ID },
        fromBlock: start,
        toBlock: end,
      });
    } catch {
      // If chunk is too large for the RPC, halve it and retry
      const halfChunk = chunkSize / 2n;
      if (halfChunk < 1n) throw new Error('Block range too small, RPC may be unavailable');
      const firstHalf = await scanAnnouncements({ ...params, fromBlock: start, toBlock: start + halfChunk - 1n, chunkSize: halfChunk });
      const secondHalf = await scanAnnouncements({ ...params, fromBlock: start + halfChunk, toBlock: end, chunkSize: halfChunk });
      results.push(...firstHalf, ...secondHalf);
      continue;
    }

    for (const log of logs) {
      const ephemeralPubKey = log.args.ephemeralPubKey as `0x${string}`;
      const metadata = log.args.metadata as `0x${string}`;
      const stealthAddress = log.args.stealthAddress as `0x${string}`;

      if (!ephemeralPubKey || !stealthAddress) continue;

      // Extract view tag from metadata (first byte after 0x)
      const announcedViewTag = metadata && metadata.length >= 4
        ? `0x${metadata.slice(2, 4)}` as `0x${string}`
        : '0x00' as `0x${string}`;

      // Quick view tag filter: compute our view tag from ECDH
      const sharedSecretCompressed = getSharedSecret(
        hexToBytes(params.viewingPrivateKey),
        hexToBytes(ephemeralPubKey)
      );
      const sharedSecretX = sharedSecretCompressed.slice(1);
      const hashedSecret = keccak256(sharedSecretX);
      const computedViewTag = `0x${hashedSecret.slice(2, 4)}`;

      if (computedViewTag !== announcedViewTag) continue;

      // View tag matched — do the full address check
      const isOurs = checkStealthAddress({
        ephemeralPublicKey: ephemeralPubKey,
        spendingPublicKey: params.spendingPublicKey,
        viewingPrivateKey: params.viewingPrivateKey,
        userStealthAddress: stealthAddress,
        viewTag: announcedViewTag,
      });

      if (!isOurs) continue;

      // Decode metadata: viewTag (1 byte) + tokenAddress (20 bytes) + amount (32 bytes)
      const { token, amount } = decodeMetadata(metadata);

      results.push({
        stealthAddress,
        ephemeralPublicKey: ephemeralPubKey,
        viewTag: announcedViewTag,
        token,
        amount,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      });
    }
  }

  return results;
}

/**
 * Decode announcement metadata.
 * Expected format: viewTag (1 byte) + tokenAddress (20 bytes) + amount (32 bytes) = 53 bytes
 * Gracefully handles unexpected formats.
 */
function decodeMetadata(metadata: `0x${string}`): {
  token: `0x${string}` | null;
  amount: bigint | null;
} {
  const clean = metadata.slice(2); // remove 0x

  // Expected: 1 + 20 + 32 = 53 bytes = 106 hex chars
  if (clean.length < 106) {
    return { token: null, amount: null };
  }

  const token = `0x${clean.slice(2, 42)}` as `0x${string}`; // bytes 1-20
  const amount = BigInt(`0x${clean.slice(42, 106)}`);         // bytes 21-52

  return { token, amount };
}
