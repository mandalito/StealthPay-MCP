import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http, namehash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  SUPPORTED_CHAINS, ENS_CONTRACTS, ENS_RESOLVER_ABI, explorerTxUrl,
  CAIP2_CHAIN_IDS, resolveChainName, toCAIP19, STABLECOINS,
} from '../config.js';
import {
  V1_ENS_KEYS, LEGACY_ENS_KEYS, STEALTH_POLICIES, NOTE_POLICIES, NOTE_PRIVACIES,
  isValidStealthPolicy, isValidNotePolicy, isValidNotePrivacy,
} from '../lib/profile.js';

export function registerSetProfile(server: McpServer) {
  server.registerTool(
    'set-profile',
    {
      title: 'Set Payment Profile',
      description:
        'Set payment preferences on your ENS name: preferred chain, token, stealth policy, and note preferences. Writes to both namespaced (stealthpay.v1.*) and legacy ENS text records for compatibility.',
      inputSchema: z.object({
        name: z
          .string()
          .describe('Your ENS name (e.g. "myname.eth")'),
        chain: z
          .string()
          .optional()
          .describe('Preferred chain (friendly name like "base" or CAIP-2 like "eip155:8453")'),
        token: z
          .string()
          .optional()
          .describe('Preferred token (symbol like "USDC" or CAIP-19 like "eip155:8453/erc20:0x...")'),
        description: z
          .string()
          .optional()
          .describe('Short description for your profile'),
        stealthPolicy: z
          .enum(['required', 'preferred', 'optional', 'disabled'])
          .optional()
          .describe('Stealth payment policy: required (block transparent), preferred (default stealth), optional (sender chooses), disabled (no stealth)'),
        notePolicy: z
          .enum(['required', 'optional', 'none'])
          .optional()
          .describe('Note/memo policy: required (sender must include note), optional (sender may include note), none (no notes accepted)'),
        noteMaxBytes: z
          .number()
          .optional()
          .describe('Maximum note length in bytes (default: 140)'),
        notePrivacy: z
          .enum(['plaintext', 'encrypted', 'hash_only'])
          .optional()
          .describe('Note privacy mode: plaintext (visible on-chain), encrypted, hash_only'),
        ensChain: z
          .string()
          .default('sepolia')
          .describe(`Chain where the ENS name is registered. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`),
      }),
    },
    async ({ name, chain, token, description, stealthPolicy, notePolicy, noteMaxBytes, notePrivacy, ensChain }) => {
      try {
        const rawKey = process.env.SENDER_PRIVATE_KEY;
        if (!rawKey) {
          return {
            content: [{
              type: 'text' as const,
              text: 'SENDER_PRIVATE_KEY is not set. Add it to your .env file and restart the MCP server.',
            }],
            isError: true,
          };
        }

        const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
        const contracts = ENS_CONTRACTS[ensChain];
        const viemChain = SUPPORTED_CHAINS[ensChain];
        if (!contracts || !viemChain) {
          return {
            content: [{
              type: 'text' as const,
              text: `ENS text records not supported on ${ensChain}. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`,
            }],
            isError: true,
          };
        }

        // Guard: if POLICY_IMMUTABLE=true, block policy field changes from agent path
        if (process.env.POLICY_IMMUTABLE === 'true' && (stealthPolicy || notePolicy || noteMaxBytes !== undefined || notePrivacy)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Policy fields (stealthPolicy, notePolicy, noteMaxBytes, notePrivacy) are immutable. POLICY_IMMUTABLE is set. Policy changes require a signed policy update from the operator.',
            }],
            isError: true,
          };
        }

        const account = privateKeyToAccount(privateKey);
        const rpcUrl = process.env.ENS_RPC_URL ?? process.env.RPC_URL;
        const publicClient = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
        const walletClient = createWalletClient({ account, chain: viemChain, transport: http(rpcUrl) });

        const node = namehash(name);
        const updates: Array<{ key: string; value: string; label: string }> = [];

        // Chain: dual-write namespaced CAIP-2 + legacy friendly name
        if (chain) {
          const friendlyName = resolveChainName(chain);
          if (!friendlyName) {
            return {
              content: [{
                type: 'text' as const,
                text: `Unknown chain "${chain}". Use a name (${Object.keys(SUPPORTED_CHAINS).join(', ')}) or CAIP-2 ID (e.g. "eip155:8453").`,
              }],
              isError: true,
            };
          }
          const caip2 = CAIP2_CHAIN_IDS[friendlyName];
          updates.push({ key: V1_ENS_KEYS.preferredChains, value: caip2, label: `preferred chain: ${friendlyName} (${caip2})` });
          updates.push({ key: LEGACY_ENS_KEYS.chain, value: friendlyName, label: `legacy chain: ${friendlyName}` });
        }

        // Token: dual-write namespaced CAIP-19 + legacy symbol
        if (token) {
          // If already CAIP-19, use directly
          if (token.includes('/')) {
            updates.push({ key: V1_ENS_KEYS.preferredAssets, value: token, label: `preferred asset: ${token}` });
            updates.push({ key: LEGACY_ENS_KEYS.token, value: token, label: `legacy token: ${token}` });
          } else {
            // Symbol like "USDC" — resolve to CAIP-19 using the preferred chain
            const resolvedChain = chain ? resolveChainName(chain) : null;
            const chainForAsset = resolvedChain ?? 'ethereum';
            const chainStables = STABLECOINS[chainForAsset];
            const tokenAddr = chainStables?.[token.toUpperCase()];
            if (tokenAddr) {
              const caip19 = toCAIP19(chainForAsset, tokenAddr);
              if (caip19) {
                updates.push({ key: V1_ENS_KEYS.preferredAssets, value: caip19, label: `preferred asset: ${token} (${caip19})` });
              }
            }
            updates.push({ key: LEGACY_ENS_KEYS.token, value: token.toUpperCase(), label: `legacy token: ${token.toUpperCase()}` });
          }
        }

        // Description (legacy key only — not namespaced)
        if (description) {
          updates.push({ key: LEGACY_ENS_KEYS.description, value: description, label: `description` });
        }

        // Stealth policy
        if (stealthPolicy) {
          updates.push({ key: V1_ENS_KEYS.stealthPolicy, value: stealthPolicy, label: `stealth policy: ${stealthPolicy}` });
        }

        // Note policy fields
        if (notePolicy) {
          updates.push({ key: V1_ENS_KEYS.notePolicy, value: notePolicy, label: `note policy: ${notePolicy}` });
        }
        if (noteMaxBytes !== undefined) {
          updates.push({ key: V1_ENS_KEYS.noteMaxBytes, value: String(noteMaxBytes), label: `note max bytes: ${noteMaxBytes}` });
        }
        if (notePrivacy) {
          updates.push({ key: V1_ENS_KEYS.notePrivacy, value: notePrivacy, label: `note privacy: ${notePrivacy}` });
        }

        if (updates.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'No profile fields provided. Specify at least one of: chain, token, description, stealthPolicy, notePolicy.',
            }],
            isError: true,
          };
        }

        // Write version marker if any v1 key is being set
        const hasV1Key = updates.some(u => u.key.startsWith('stealthpay.v1.'));
        if (hasV1Key) {
          updates.unshift({ key: V1_ENS_KEYS.version, value: '1', label: 'profile version: 1' });
        }

        const txHashes: string[] = [];
        for (const { key, value } of updates) {
          const txHash = await walletClient.writeContract({
            address: contracts.resolver,
            abi: ENS_RESOLVER_ABI,
            functionName: 'setText',
            args: [node, key, value],
          });

          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            timeout: 120_000,
            pollingInterval: 3_000,
          });

          txHashes.push(txHash);
        }

        const lines = [
          `Profile updated for **${name}**`,
          '',
        ];

        for (let i = 0; i < updates.length; i++) {
          lines.push(`${updates[i].label} — ${explorerTxUrl(ensChain, txHashes[i])}`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error updating profile: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
