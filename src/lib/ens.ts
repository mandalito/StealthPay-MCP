import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ERC6538_REGISTRY, ERC6538_REGISTRY_ABI, SCHEME_ID, SUPPORTED_CHAINS, DEFAULT_CHAIN } from '../config.js';

// ENS resolution defaults to mainnet but can be overridden via ENS_CHAIN env var
// (e.g. ENS_CHAIN=sepolia for testnet ENS names)
// Lazy-initialized to ensure dotenv has loaded before reading env vars
let _ensClient: PublicClient | null = null;

function getEnsClient(): PublicClient {
  if (!_ensClient) {
    const chainName = process.env.ENS_CHAIN;
    const chain = chainName ? SUPPORTED_CHAINS[chainName] ?? mainnet : mainnet;
    _ensClient = createPublicClient({
      chain,
      transport: http(process.env.ENS_RPC_URL),
    });
  }
  return _ensClient;
}

export interface PaymentProfile {
  ensName: string;
  address: string | null;
  avatar: string | null;
  preferredChain: string | null;
  preferredToken: string | null;
  stealthMetaAddress: string | null;
  description: string | null;
}

/**
 * Resolve an ENS name and fetch payment-related text records.
 */
export async function getPaymentProfile(name: string): Promise<PaymentProfile> {
  const normalizedName = normalize(name);

  // Fetch address and text records in parallel
  const [address, avatar, preferredChain, preferredToken, stealthMetaAddress, description] =
    await Promise.all([
      getEnsClient().getEnsAddress({ name: normalizedName }),
      getEnsClient().getEnsText({ name: normalizedName, key: 'avatar' }),
      getEnsClient().getEnsText({ name: normalizedName, key: 'chain' }),
      getEnsClient().getEnsText({ name: normalizedName, key: 'token' }),
      getEnsClient().getEnsText({
        name: normalizedName,
        key: 'stealth-meta-address',
      }),
      getEnsClient().getEnsText({ name: normalizedName, key: 'description' }),
    ]);

  // If no stealth meta-address in ENS text records, check ERC-6538 registry
  let resolvedStealthMetaAddress = stealthMetaAddress ?? null;
  if (!resolvedStealthMetaAddress && address) {
    resolvedStealthMetaAddress = await getStealthMetaAddressFromRegistry(address);
  }

  return {
    ensName: normalizedName,
    address: address ?? null,
    avatar: avatar ?? null,
    preferredChain: preferredChain ?? null,
    preferredToken: preferredToken ?? null,
    stealthMetaAddress: resolvedStealthMetaAddress,
    description: description ?? null,
  };
}

/**
 * Look up the stealth meta-address for an ENS name.
 * Checks ENS text records first, then falls back to the ERC-6538 registry.
 */
export async function getStealthMetaAddress(name: string): Promise<string | null> {
  const normalizedName = normalize(name);

  // 1. Check ENS text record
  const fromEns = await getEnsClient().getEnsText({
    name: normalizedName,
    key: 'stealth-meta-address',
  });
  if (fromEns) return fromEns;

  // 2. Fallback: resolve address and check ERC-6538 registry
  const address = await getEnsClient().getEnsAddress({ name: normalizedName });
  if (!address) return null;

  return getStealthMetaAddressFromRegistry(address);
}

/**
 * Get a public client for the payment chain (distinct from the ENS client).
 * Uses CHAIN env var (or DEFAULT_CHAIN) to resolve the registry on the
 * chain where payments will be sent, not the ENS lookup chain.
 */
function getPaymentChainClient(): PublicClient {
  const chainName = process.env.CHAIN ?? DEFAULT_CHAIN;
  const chain = SUPPORTED_CHAINS[chainName] ?? mainnet;
  return createPublicClient({
    chain,
    transport: http(process.env.RPC_URL),
  });
}

/**
 * Query the ERC-6538 registry contract for a stealth meta-address.
 * Uses the payment chain client (not ENS chain) for registry lookups.
 */
async function getStealthMetaAddressFromRegistry(
  address: `0x${string}`
): Promise<string | null> {
  try {
    const client = getPaymentChainClient();
    const result = await client.readContract({
      address: ERC6538_REGISTRY,
      abi: ERC6538_REGISTRY_ABI,
      functionName: 'stealthMetaAddressOf',
      args: [address, SCHEME_ID],
    });

    // The registry returns empty bytes if no key is registered
    const hex = result as `0x${string}`;
    if (!hex || hex === '0x' || hex === '0x0') return null;

    return hex;
  } catch {
    // Contract call failed (e.g. contract not deployed on this chain)
    return null;
  }
}
