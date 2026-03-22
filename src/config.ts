import { type Chain, mainnet, base, optimism, arbitrum, polygon, gnosis, sepolia, hoodi } from 'viem/chains';

// ERC-5564 Announcer — singleton deployed at same address on all chains
export const ERC5564_ANNOUNCER = '0x55649E01B5Df198D18D95b5cc5051630cfD45564' as const;

// ERC-6538 Registry — singleton deployed at same address on all chains
export const ERC6538_REGISTRY = '0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538' as const;

// Scheme ID 1 = secp256k1 (the only scheme currently defined)
export const SCHEME_ID = 1n;

// Supported chains
export const SUPPORTED_CHAINS: Record<string, Chain> = {
  ethereum: mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  gnosis,
  sepolia,
  hoodi,
};

// Default chain for operations
export const DEFAULT_CHAIN = 'sepolia';

// ERC-3770 chain short names for stealth meta-address prefix (st:<shortName>:...)
export const CHAIN_SHORT_NAMES: Record<string, string> = {
  ethereum: 'eth',
  base: 'base',
  optimism: 'oeth',
  arbitrum: 'arb1',
  polygon: 'matic',
  gnosis: 'gno',
  sepolia: 'sep',
  hoodi: 'hoodi',
};

// CAIP-2 chain identifiers (eip155:<chainId>)
export const CAIP2_CHAIN_IDS: Record<string, string> = {
  ethereum: 'eip155:1',
  base: 'eip155:8453',
  optimism: 'eip155:10',
  arbitrum: 'eip155:42161',
  polygon: 'eip155:137',
  gnosis: 'eip155:100',
  sepolia: 'eip155:11155111',
  hoodi: 'eip155:560048',
};

// Reverse lookup: CAIP-2 → friendly name
export const CAIP2_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(CAIP2_CHAIN_IDS).map(([name, caip]) => [caip, name])
);

/**
 * Resolve a chain identifier to a friendly name.
 * Accepts: friendly name ("base"), CAIP-2 ("eip155:8453"), or returns null.
 */
export function resolveChainName(input: string): string | null {
  if (SUPPORTED_CHAINS[input]) return input;
  if (CAIP2_TO_NAME[input]) return CAIP2_TO_NAME[input];
  return null;
}

/**
 * Convert a friendly chain name to CAIP-2.
 */
export function toCAIP2(chainName: string): string | null {
  return CAIP2_CHAIN_IDS[chainName] ?? null;
}

/**
 * Build a CAIP-19 asset identifier.
 * Native: eip155:<chainId>/slip44:60
 * ERC-20: eip155:<chainId>/erc20:<contractAddress>
 */
export function toCAIP19(chainName: string, tokenAddress: string): string | null {
  const caip2 = CAIP2_CHAIN_IDS[chainName];
  if (!caip2) return null;
  if (tokenAddress.toUpperCase() === 'ETH' || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return `${caip2}/slip44:60`;
  }
  return `${caip2}/erc20:${tokenAddress.toLowerCase()}`;
}

/**
 * Parse a CAIP-19 asset identifier into chain + token info.
 * Returns null if format is invalid.
 */
export function parseCAIP19(caip19: string): { chainName: string; tokenAddress: string; isNative: boolean } | null {
  const [chainPart, assetPart] = caip19.split('/');
  if (!chainPart || !assetPart) return null;

  const chainName = CAIP2_TO_NAME[chainPart];
  if (!chainName) return null;

  if (assetPart === 'slip44:60') {
    return { chainName, tokenAddress: 'ETH', isNative: true };
  }

  const erc20Match = assetPart.match(/^erc20:(0x[0-9a-fA-F]{40})$/);
  if (erc20Match) {
    return { chainName, tokenAddress: erc20Match[1], isNative: false };
  }

  return null;
}

/**
 * Get block explorer URL for a transaction or address.
 */
export function explorerTxUrl(chainName: string, txHash: string): string {
  const chain = SUPPORTED_CHAINS[chainName];
  const baseUrl = chain?.blockExplorers?.default?.url;
  if (!baseUrl) return txHash;
  return `${baseUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(chainName: string, address: string): string {
  const chain = SUPPORTED_CHAINS[chainName];
  const baseUrl = chain?.blockExplorers?.default?.url;
  if (!baseUrl) return address;
  return `${baseUrl}/address/${address}`;
}

// Common stablecoin addresses per chain
export const STABLECOINS: Record<string, Record<string, `0x${string}`>> = {
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  },
  optimism: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  polygon: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  gnosis: {
    USDC: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
    WXDAI: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
  },
  sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
  },
};

// ERC-20 ABI (minimal — just what we need for transfers)
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// ENS contract addresses per chain (registration + resolver)
export const ENS_CONTRACTS: Record<string, {
  controller: `0x${string}`;
  resolver: `0x${string}`;
  reverseRegistrar?: `0x${string}`;
}> = {
  sepolia: {
    controller: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968',
    resolver: '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5',
    reverseRegistrar: '0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6',
  },
  ethereum: {
    controller: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    resolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
    reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb',
  },
};

// ENS Reverse Registrar ABI
export const ENS_REVERSE_REGISTRAR_ABI = [
  {
    name: 'setName',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

// ENS Registrar Controller ABI (struct-based, ENS V3)
export const ENS_CONTROLLER_ABI = [
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'label', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'minCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'rentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'label', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [{
      name: 'price',
      type: 'tuple',
      components: [
        { name: 'base', type: 'uint256' },
        { name: 'premium', type: 'uint256' },
      ],
    }],
  },
  {
    name: 'makeCommitment',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{
      name: 'registration',
      type: 'tuple',
      components: [
        { name: 'label', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'uint8' },
        { name: 'referrer', type: 'bytes32' },
      ],
    }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'registration',
      type: 'tuple',
      components: [
        { name: 'label', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'uint8' },
        { name: 'referrer', type: 'bytes32' },
      ],
    }],
    outputs: [],
  },
] as const;

// ENS Resolver ABI (minimal — setText for stealth meta-address)
export const ENS_RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
] as const;

// ERC-6538 Registry ABI (read + write)
export const ERC6538_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'registrant', type: 'address' },
      { internalType: 'uint256', name: 'schemeId', type: 'uint256' },
    ],
    name: 'stealthMetaAddressOf',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'schemeId', type: 'uint256' },
      { internalType: 'bytes', name: 'stealthMetaAddress', type: 'bytes' },
    ],
    name: 'registerKeys',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC-5564 Announcer ABI (minimal — just what we need for announcements)
export const ERC5564_ANNOUNCER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'schemeId', type: 'uint256' },
      { internalType: 'address', name: 'stealthAddress', type: 'address' },
      { internalType: 'bytes', name: 'ephemeralPubKey', type: 'bytes' },
      { internalType: 'bytes', name: 'metadata', type: 'bytes' },
    ],
    name: 'announce',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'schemeId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'stealthAddress', type: 'address' },
      { indexed: true, internalType: 'address', name: 'caller', type: 'address' },
      { indexed: false, internalType: 'bytes', name: 'ephemeralPubKey', type: 'bytes' },
      { indexed: false, internalType: 'bytes', name: 'metadata', type: 'bytes' },
    ],
    name: 'Announcement',
    type: 'event',
  },
] as const;
