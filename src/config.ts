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
export const DEFAULT_CHAIN = 'base';

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
}> = {
  sepolia: {
    controller: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968',
    resolver: '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5',
  },
  ethereum: {
    controller: '0x253553366Da8546fC250F225fe3d25d0C782303b',
    resolver: '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63',
  },
};

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

// ERC-6538 Registry ABI (minimal — just what we need for lookups)
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
