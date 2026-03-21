import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http, namehash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SUPPORTED_CHAINS, ENS_CONTRACTS, ENS_RESOLVER_ABI, explorerTxUrl } from '../config.js';

export function registerSetProfile(server: McpServer) {
  server.registerTool(
    'set-profile',
    {
      title: 'Set Payment Profile',
      description:
        'Set payment preferences on your ENS name: preferred chain, token, and description. These are stored as ENS text records on-chain. Other users and tools will see your preferences when looking up your profile.',
      inputSchema: z.object({
        name: z
          .string()
          .describe('Your ENS name (e.g. "myname.eth")'),
        chain: z
          .string()
          .optional()
          .describe('Preferred chain for receiving payments (e.g. "sepolia", "base", "ethereum")'),
        token: z
          .string()
          .optional()
          .describe('Preferred token for receiving payments (e.g. "ETH", "USDC")'),
        description: z
          .string()
          .optional()
          .describe('Short description for your profile'),
        ensChain: z
          .string()
          .default('sepolia')
          .describe(`Chain where the ENS name is registered. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`),
      }),
    },
    async ({ name, chain, token, description, ensChain }) => {
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

        const account = privateKeyToAccount(privateKey);
        const rpcUrl = process.env.ENS_RPC_URL ?? process.env.RPC_URL;
        const publicClient = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
        const walletClient = createWalletClient({ account, chain: viemChain, transport: http(rpcUrl) });

        const node = namehash(name);
        const updates: Array<{ key: string; value: string }> = [];

        if (chain) updates.push({ key: 'chain', value: chain });
        if (token) updates.push({ key: 'token', value: token });
        if (description) updates.push({ key: 'description', value: description });

        if (updates.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'No profile fields provided. Specify at least one of: chain, token, description.',
            }],
            isError: true,
          };
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
          lines.push(`${updates[i].key}: ${updates[i].value} — ${explorerTxUrl(ensChain, txHashes[i])}`);
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
