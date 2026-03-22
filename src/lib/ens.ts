import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import {
  ERC6538_REGISTRY, ERC6538_REGISTRY_ABI, SCHEME_ID,
  SUPPORTED_CHAINS, DEFAULT_CHAIN, CAIP2_TO_NAME, CAIP2_CHAIN_IDS, resolveChainName,
} from '../config.js';
import {
  type PaymentProfile, type StealthPolicy, type NotePolicy, type NotePrivacy,
  V1_ENS_KEYS, LEGACY_ENS_KEYS, PROFILE_DEFAULTS,
  isValidStealthPolicy, isValidNotePolicy, isValidNotePrivacy,
} from './profile.js';

// Re-export PaymentProfile so existing consumers keep working
export type { PaymentProfile } from './profile.js';

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

/**
 * Resolve an ENS name and fetch payment-related text records.
 * Reads stealthpay.v1.* namespaced keys first, falls back to legacy keys.
 */
export async function getPaymentProfile(name: string): Promise<PaymentProfile> {
  const normalizedName = normalize(name);
  const client = getEnsClient();
  const getText = (key: string) => client.getEnsText({ name: normalizedName, key });

  // Fetch all keys in parallel: v1 namespaced + legacy + address
  const [
    address,
    // v1 keys
    v1Chains, v1Assets, v1StealthPolicy, v1SchemeIds,
    v1NotePolicy, v1NoteMaxBytes, v1NotePrivacy,
    // legacy keys
    legacyChain, legacyToken, legacyDescription,
    legacyStealthMeta, legacyAvatar,
  ] = await Promise.all([
    client.getEnsAddress({ name: normalizedName }),
    // v1
    getText(V1_ENS_KEYS.preferredChains),
    getText(V1_ENS_KEYS.preferredAssets),
    getText(V1_ENS_KEYS.stealthPolicy),
    getText(V1_ENS_KEYS.stealthSchemeIds),
    getText(V1_ENS_KEYS.notePolicy),
    getText(V1_ENS_KEYS.noteMaxBytes),
    getText(V1_ENS_KEYS.notePrivacy),
    // legacy
    getText(LEGACY_ENS_KEYS.chain),
    getText(LEGACY_ENS_KEYS.token),
    getText(LEGACY_ENS_KEYS.description),
    getText(LEGACY_ENS_KEYS.stealthMetaAddress),
    getText(LEGACY_ENS_KEYS.avatar),
  ]);

  // Resolve stealth meta-address: ENS text record → ERC-6538 registry fallback
  let resolvedStealthMetaAddress = legacyStealthMeta ?? null;
  if (!resolvedStealthMetaAddress && address) {
    resolvedStealthMetaAddress = await getStealthMetaAddressFromRegistry(address);
  }

  // Parse v1 CAIP-2 chains list, fallback to legacy
  let preferredChains: string[] = [];
  let preferredChain: string | null = null;
  if (v1Chains) {
    preferredChains = v1Chains.split(',').map(s => s.trim()).filter(Boolean);
    // Derive friendly name from first CAIP-2 entry
    if (preferredChains.length > 0) {
      preferredChain = CAIP2_TO_NAME[preferredChains[0]] ?? preferredChains[0];
    }
  } else if (legacyChain) {
    preferredChain = legacyChain;
    // Convert legacy friendly name to CAIP-2
    const caip2 = CAIP2_CHAIN_IDS[legacyChain];
    if (caip2) preferredChains = [caip2];
  }

  // Parse v1 CAIP-19 assets list, fallback to legacy
  let preferredAssets: string[] = [];
  let preferredToken: string | null = null;
  if (v1Assets) {
    preferredAssets = v1Assets.split(',').map(s => s.trim()).filter(Boolean);
    // Derive friendly token label from first entry
    if (preferredAssets.length > 0) {
      preferredToken = friendlyAssetLabel(preferredAssets[0]);
    }
  } else if (legacyToken) {
    preferredToken = legacyToken;
  }

  // Stealth policy
  const stealthPolicy: StealthPolicy =
    (v1StealthPolicy && isValidStealthPolicy(v1StealthPolicy))
      ? v1StealthPolicy
      : PROFILE_DEFAULTS.stealthPolicy;

  const stealthSchemeIds = v1SchemeIds
    ? v1SchemeIds.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    : [...PROFILE_DEFAULTS.stealthSchemeIds];

  // Note policy
  const notePolicy: NotePolicy =
    (v1NotePolicy && isValidNotePolicy(v1NotePolicy))
      ? v1NotePolicy
      : PROFILE_DEFAULTS.notePolicy;

  const noteMaxBytes = v1NoteMaxBytes
    ? parseInt(v1NoteMaxBytes, 10) || PROFILE_DEFAULTS.noteMaxBytes
    : PROFILE_DEFAULTS.noteMaxBytes;

  const notePrivacy: NotePrivacy =
    (v1NotePrivacy && isValidNotePrivacy(v1NotePrivacy))
      ? v1NotePrivacy
      : PROFILE_DEFAULTS.notePrivacy;

  return {
    ensName: normalizedName,
    address: address ?? null,
    avatar: legacyAvatar ?? null,
    description: legacyDescription ?? null,
    preferredChains,
    preferredAssets,
    preferredChain,
    preferredToken,
    stealthMetaAddress: resolvedStealthMetaAddress,
    stealthPolicy,
    stealthSchemeIds,
    notePolicy,
    noteMaxBytes,
    notePrivacy,
  };
}

/**
 * Derive a friendly label from a CAIP-19 asset identifier.
 */
function friendlyAssetLabel(caip19: string): string {
  if (caip19.includes('/slip44:60')) return 'ETH';
  // Try to match known stablecoin addresses
  const erc20Match = caip19.match(/erc20:(0x[0-9a-fA-F]{40})/i);
  if (!erc20Match) return caip19;
  // reverse-lookup from STABLECOINS is possible but keep it simple
  return erc20Match[1].slice(0, 10) + '...';
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
