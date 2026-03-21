import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  SUPPORTED_CHAINS,
  STABLECOINS,
  ERC20_ABI,
  DEFAULT_CHAIN,
  ERC5564_ANNOUNCER,
  ERC5564_ANNOUNCER_ABI,
  SCHEME_ID,
} from '../config.js';

/**
 * Send an ERC-20 stablecoin to a stealth address and announce via ERC-5564.
 */
export async function sendStablecoin(params: {
  to: `0x${string}`;
  amount: string;
  token: string;
  chain?: string;
  privateKey: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
}): Promise<{ transferTxHash: string; announceTxHash: string | null; announceFailed?: boolean }> {
  const chainName = params.chain ?? DEFAULT_CHAIN;
  const chain = SUPPORTED_CHAINS[chainName];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`);
  }

  const chainStables = STABLECOINS[chainName];
  if (!chainStables) {
    throw new Error(`No stablecoins configured for chain: ${chainName}`);
  }

  const tokenAddress = chainStables[params.token.toUpperCase()];
  if (!tokenAddress) {
    throw new Error(
      `Token ${params.token} not available on ${chainName}. Available: ${Object.keys(chainStables).join(', ')}`
    );
  }

  // Validate private key format
  if (!/^0x[0-9a-fA-F]{64}$/.test(params.privateKey)) {
    throw new Error('Invalid private key format. Expected 0x-prefixed 32-byte hex string.');
  }

  const account = privateKeyToAccount(params.privateKey);

  const rpcUrl = process.env.RPC_URL;
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // Get token decimals
  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  const amountInUnits = parseUnits(params.amount, decimals);

  // Pre-flight: check sender balance
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  if ((balance as bigint) < amountInUnits) {
    throw new Error(
      `Insufficient ${params.token.toUpperCase()} balance. Have: ${balance}, need: ${amountInUnits}`
    );
  }

  // 1. Send the ERC-20 transfer to the stealth address
  const transferTxHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [params.to, amountInUnits],
  });

  // 2. Announce the payment via ERC-5564 so the recipient can discover it
  // Metadata format: view tag (1 byte) + token address + amount
  const metadata = encodeAnnouncementMetadata(params.viewTag, tokenAddress, amountInUnits);

  let announceTxHash: string | null = null;
  let announceFailed = false;
  try {
    announceTxHash = await walletClient.writeContract({
      address: ERC5564_ANNOUNCER,
      abi: ERC5564_ANNOUNCER_ABI,
      functionName: 'announce',
      args: [SCHEME_ID, params.to, params.ephemeralPublicKey, metadata],
    });
  } catch (announceError) {
    // Transfer succeeded but announcement failed — funds are sent but recipient
    // can't discover them without the ephemeral public key. Flag this so the
    // caller can surface recovery info.
    announceFailed = true;
  }

  return { transferTxHash, announceTxHash, announceFailed };
}

/**
 * Encode metadata for the ERC-5564 announcement.
 * Format: viewTag (1 byte) ++ tokenAddress (20 bytes) ++ amount (32 bytes)
 */
function encodeAnnouncementMetadata(
  viewTag: `0x${string}`,
  tokenAddress: `0x${string}`,
  amount: bigint
): `0x${string}` {
  // View tag is the first byte
  const vt = viewTag.slice(2).padStart(2, '0');
  // Token address without 0x prefix
  const token = tokenAddress.slice(2).toLowerCase();
  // Amount as 32-byte hex
  const amt = amount.toString(16).padStart(64, '0');

  return `0x${vt}${token}${amt}` as `0x${string}`;
}

/**
 * Generate a shareable payment link that encodes recipient + amount + stealth info.
 */
export function createPaymentLink(params: {
  to: string;
  amount?: string;
  token?: string;
  chain?: string;
  memo?: string;
}): string {
  const base = process.env.PAYMENT_LINK_BASE_URL ?? 'https://stealthpay.link/pay';
  const query = new URLSearchParams();
  query.set('to', params.to);
  if (params.amount) query.set('amount', params.amount);
  if (params.token) query.set('token', params.token);
  if (params.chain) query.set('chain', params.chain);
  if (params.memo) query.set('memo', params.memo);
  return `${base}?${query.toString()}`;
}
