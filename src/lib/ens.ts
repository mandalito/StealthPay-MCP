import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { ERC6538_REGISTRY, ERC6538_REGISTRY_ABI, SCHEME_ID } from '../config.js';

// ENS resolution always happens on mainnet
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ENS_RPC_URL),
});

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
      ensClient.getEnsAddress({ name: normalizedName }),
      ensClient.getEnsText({ name: normalizedName, key: 'avatar' }),
      ensClient.getEnsText({ name: normalizedName, key: 'chain' }),
      ensClient.getEnsText({ name: normalizedName, key: 'token' }),
      ensClient.getEnsText({
        name: normalizedName,
        key: 'stealth-meta-address',
      }),
      ensClient.getEnsText({ name: normalizedName, key: 'description' }),
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
  const fromEns = await ensClient.getEnsText({
    name: normalizedName,
    key: 'stealth-meta-address',
  });
  if (fromEns) return fromEns;

  // 2. Fallback: resolve address and check ERC-6538 registry
  const address = await ensClient.getEnsAddress({ name: normalizedName });
  if (!address) return null;

  return getStealthMetaAddressFromRegistry(address);
}

/**
 * Query the ERC-6538 registry contract for a stealth meta-address.
 */
async function getStealthMetaAddressFromRegistry(
  address: `0x${string}`
): Promise<string | null> {
  try {
    const result = await ensClient.readContract({
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
