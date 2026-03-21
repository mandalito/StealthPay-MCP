/**
 * ENS name registration and text record management.
 */

import { createPublicClient, createWalletClient, http, formatEther, namehash, pad, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getPublicKey, utils } from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from 'viem/utils';
import {
  SUPPORTED_CHAINS,
  ENS_CONTRACTS,
  ENS_CONTROLLER_ABI,
  ENS_RESOLVER_ABI,
} from '../config.js';

// ── ENS Name Registration ──────────────────────────────────────────────────

export interface RegisterNameParams {
  label: string;         // just the label, not "label.eth"
  privateKey: `0x${string}`;
  chain?: string;        // "sepolia" or "ethereum"
  duration?: bigint;     // in seconds, defaults to 1 year
}

export interface RegisterNameResult {
  name: string;
  owner: `0x${string}`;
  commitTxHash: `0x${string}`;
  registerTxHash: `0x${string}`;
  cost: string;
  expiresIn: string;
}

const ONE_YEAR = 31_536_000n;

/**
 * Register an ENS name. Full flow: check availability → commit → wait → register.
 *
 * @param onStatus - callback for progress updates (the wait step takes ~60s)
 */
export async function registerEnsName(
  params: RegisterNameParams,
  onStatus?: (msg: string) => void,
): Promise<RegisterNameResult> {
  const chainName = params.chain ?? 'sepolia';
  const chain = SUPPORTED_CHAINS[chainName];
  const contracts = ENS_CONTRACTS[chainName];
  if (!chain || !contracts) {
    throw new Error(
      `ENS registration not supported on ${chainName}. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`
    );
  }

  const duration = params.duration ?? ONE_YEAR;
  const account = privateKeyToAccount(params.privateKey);

  const rpcUrl = process.env.ENS_RPC_URL ?? process.env.RPC_URL;
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // 1. Check availability
  const isAvailable = await publicClient.readContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'available',
    args: [params.label],
  });

  if (!isAvailable) {
    throw new Error(`"${params.label}.eth" is not available for registration.`);
  }

  // 2. Check price
  const price = await publicClient.readContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [params.label, duration],
  });

  const totalCost = BigInt(price.base) + BigInt(price.premium);
  const costWithBuffer = totalCost * 110n / 100n; // 10% buffer for price fluctuation

  onStatus?.(`Price: ${formatEther(totalCost)} ETH (+ 10% buffer)`);

  // 3. Get min commitment age
  const minCommitmentAge = await publicClient.readContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'minCommitmentAge',
  });

  // 4. Generate secret and make commitment
  const secret = pad(toHex(BigInt('0x' + bytesToHex(utils.randomSecretKey()).slice(2))), { size: 32 });

  const registration = {
    label: params.label,
    owner: account.address,
    duration,
    secret,
    resolver: contracts.resolver,
    data: [] as `0x${string}`[],
    reverseRecord: 0,
    referrer: pad('0x0', { size: 32 }),
  };

  const commitment = await publicClient.readContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'makeCommitment',
    args: [registration],
  });

  // 5. Submit commitment
  onStatus?.('Submitting commitment...');
  const commitTxHash = await walletClient.writeContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'commit',
    args: [commitment],
  });

  const commitReceipt = await publicClient.waitForTransactionReceipt({
    hash: commitTxHash,
    timeout: 120_000,
    pollingInterval: 3_000,
  });
  if (commitReceipt.status !== 'success') {
    throw new Error(`Commit transaction reverted: ${commitTxHash}`);
  }
  onStatus?.(`Commitment tx: ${commitTxHash}`);

  // 6. Wait for commitment age
  const waitSeconds = Number(minCommitmentAge) + 5; // +5s safety margin
  onStatus?.(`Waiting ${waitSeconds}s for commitment to mature...`);
  await sleep(waitSeconds * 1000);

  // 7. Register
  onStatus?.('Registering...');
  const registerTxHash = await walletClient.writeContract({
    address: contracts.controller,
    abi: ENS_CONTROLLER_ABI,
    functionName: 'register',
    args: [registration],
    value: costWithBuffer,
  });

  onStatus?.(`Register tx submitted: ${registerTxHash}`);
  const registerReceipt = await publicClient.waitForTransactionReceipt({
    hash: registerTxHash,
    timeout: 120_000,
    pollingInterval: 3_000,
  });
  if (registerReceipt.status !== 'success') {
    throw new Error(
      `Register transaction reverted: ${registerTxHash}. The ENS name was not registered.`
    );
  }

  const years = Number(duration) / Number(ONE_YEAR);

  return {
    name: `${params.label}.eth`,
    owner: account.address,
    commitTxHash,
    registerTxHash,
    cost: `${formatEther(totalCost)} ETH`,
    expiresIn: `${years} year${years > 1 ? 's' : ''}`,
  };
}

// ── Stealth Key Registration ───────────────────────────────────────────────

export interface RegisterStealthKeysResult {
  name: string;
  txHash: `0x${string}`;
  stealthMetaAddress: string;
  spendingPrivateKey: `0x${string}`;
  spendingPublicKey: `0x${string}`;
  viewingPrivateKey: `0x${string}`;
  viewingPublicKey: `0x${string}`;
  keysReused: boolean;
}

/**
 * Generate stealth keypairs and set the stealth-meta-address text record on an ENS name.
 */
export async function registerStealthKeys(params: {
  name: string;             // full ENS name, e.g. "stealthpay.eth"
  privateKey: `0x${string}`;
  chain?: string;
}): Promise<RegisterStealthKeysResult> {
  const chainName = params.chain ?? 'sepolia';
  const chain = SUPPORTED_CHAINS[chainName];
  const contracts = ENS_CONTRACTS[chainName];
  if (!chain || !contracts) {
    throw new Error(`ENS text record setting not supported on ${chainName}`);
  }

  const account = privateKeyToAccount(params.privateKey);

  const rpcUrl = process.env.ENS_RPC_URL ?? process.env.RPC_URL;
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Reuse existing keypairs if available, otherwise generate new ones.
  // This ensures all ENS names share the same stealth identity.
  const existingSpendingPriv = process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
  const existingViewingPriv = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

  let spendingPriv: Uint8Array;
  let spendingPub: Uint8Array;
  let viewingPriv: Uint8Array;
  let viewingPub: Uint8Array;
  let keysReused: boolean;

  if (existingSpendingPriv && existingViewingPriv) {
    // Reuse existing keys
    spendingPriv = hexToBytes(existingSpendingPriv as `0x${string}`);
    spendingPub = getPublicKey(spendingPriv, true);
    viewingPriv = hexToBytes(existingViewingPriv as `0x${string}`);
    viewingPub = getPublicKey(viewingPriv, true);
    keysReused = true;
  } else {
    // Generate fresh keypairs
    spendingPriv = utils.randomSecretKey();
    spendingPub = getPublicKey(spendingPriv, true);
    viewingPriv = utils.randomSecretKey();
    viewingPub = getPublicKey(viewingPriv, true);
    keysReused = false;
  }

  const stealthMetaAddress =
    'st:eth:0x' +
    bytesToHex(spendingPub).slice(2) +
    bytesToHex(viewingPub).slice(2);

  // Set the text record on the resolver
  const node = namehash(params.name);

  const txHash = await walletClient.writeContract({
    address: contracts.resolver,
    abi: ENS_RESOLVER_ABI,
    functionName: 'setText',
    args: [node, 'stealth-meta-address', stealthMetaAddress],
  });

  await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
    pollingInterval: 3_000,
  });

  return {
    name: params.name,
    txHash,
    stealthMetaAddress,
    spendingPrivateKey: bytesToHex(spendingPriv) as `0x${string}`,
    spendingPublicKey: bytesToHex(spendingPub) as `0x${string}`,
    viewingPrivateKey: bytesToHex(viewingPriv) as `0x${string}`,
    viewingPublicKey: bytesToHex(viewingPub) as `0x${string}`,
    keysReused,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
