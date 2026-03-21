import { createPublicClient, createWalletClient, http, parseUnits, parseEther, formatEther, formatUnits } from 'viem';
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

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000' as `0x${string}`;

/**
 * Resolve a token identifier to a contract address.
 * Accepts: "ETH", a symbol like "USDC", or a 0x contract address.
 */
function resolveToken(token: string, chainName: string): { address: `0x${string}` | 'ETH'; isNative: boolean } {
  if (token.toUpperCase() === 'ETH') {
    return { address: 'ETH', isNative: true };
  }

  // If it looks like a contract address, use it directly
  if (token.startsWith('0x') && token.length === 42) {
    return { address: token as `0x${string}`, isNative: false };
  }

  // Look up by symbol in the stablecoins map
  const chainStables = STABLECOINS[chainName];
  if (chainStables) {
    const addr = chainStables[token.toUpperCase()];
    if (addr) {
      return { address: addr, isNative: false };
    }
  }

  throw new Error(
    `Unknown token "${token}" on ${chainName}. Use "ETH", a known symbol (${Object.keys(STABLECOINS[chainName] ?? {}).join(', ') || 'none configured'}), or a 0x contract address.`
  );
}

/**
 * Send ETH or any ERC-20 token to a stealth address and announce via ERC-5564.
 */
export async function sendToStealth(params: {
  to: `0x${string}`;
  amount: string;
  token: string;
  chain?: string;
  privateKey: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
}): Promise<{ transferTxHash: string; announceTxHash: string | null; announceFailed?: boolean; tokenLabel: string }> {
  const chainName = params.chain ?? DEFAULT_CHAIN;
  const chain = SUPPORTED_CHAINS[chainName];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`);
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(params.privateKey)) {
    throw new Error('Invalid private key format. Expected 0x-prefixed 32-byte hex string.');
  }

  const { address: tokenAddress, isNative } = resolveToken(params.token, chainName);
  const account = privateKeyToAccount(params.privateKey);

  const rpcUrl = process.env.RPC_URL;
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  let transferTxHash: string;
  let metadataTokenAddress: `0x${string}`;
  let metadataAmount: bigint;
  let tokenLabel: string;

  if (isNative) {
    // Native ETH
    const value = parseEther(params.amount);
    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < value) {
      throw new Error(`Insufficient ETH. Have: ${formatEther(balance)}, need: ${params.amount}`);
    }

    transferTxHash = await walletClient.sendTransaction({
      to: params.to,
      value,
    });

    metadataTokenAddress = ADDRESS_ZERO;
    metadataAmount = value;
    tokenLabel = 'ETH';
  } else {
    // ERC-20 token
    const addr = tokenAddress as `0x${string}`;

    const [decimals, balance] = await Promise.all([
      publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'decimals' }),
      publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    ]);

    const amountInUnits = parseUnits(params.amount, decimals as number);
    if ((balance as bigint) < amountInUnits) {
      throw new Error(
        `Insufficient token balance. Have: ${formatUnits(balance as bigint, decimals as number)}, need: ${params.amount}`
      );
    }

    transferTxHash = await walletClient.writeContract({
      address: addr,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [params.to, amountInUnits],
    });

    metadataTokenAddress = addr;
    metadataAmount = amountInUnits;
    tokenLabel = params.token.toUpperCase();
  }

  // Announce via ERC-5564
  const metadata = encodeAnnouncementMetadata(params.viewTag, metadataTokenAddress, metadataAmount);

  let announceTxHash: string | null = null;
  let announceFailed = false;
  try {
    announceTxHash = await walletClient.writeContract({
      address: ERC5564_ANNOUNCER,
      abi: ERC5564_ANNOUNCER_ABI,
      functionName: 'announce',
      args: [SCHEME_ID, params.to, params.ephemeralPublicKey, metadata],
    });
  } catch {
    announceFailed = true;
  }

  return { transferTxHash, announceTxHash, announceFailed, tokenLabel };
}

// Keep backward compat alias
export const sendStablecoin = sendToStealth;

/**
 * Encode metadata for the ERC-5564 announcement.
 * Format: viewTag (1 byte) ++ tokenAddress (20 bytes) ++ amount (32 bytes)
 */
function encodeAnnouncementMetadata(
  viewTag: `0x${string}`,
  tokenAddress: `0x${string}`,
  amount: bigint
): `0x${string}` {
  const vt = viewTag.slice(2).padStart(2, '0');
  const token = tokenAddress.slice(2).toLowerCase();
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
