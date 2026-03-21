import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SUPPORTED_CHAINS, STABLECOINS, ERC20_ABI, DEFAULT_CHAIN } from '../config.js';

export function registerGetBalances(server: McpServer) {
  server.registerTool(
    'get-balances',
    {
      title: 'Get Wallet Balances',
      description:
        'Check your wallet balances: native ETH and known tokens on a given chain. Uses SENDER_PRIVATE_KEY from environment — the key is never exposed.',
      inputSchema: z.object({
        chain: z
          .string()
          .default(DEFAULT_CHAIN)
          .describe(`Chain to check (default: ${DEFAULT_CHAIN}). Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
      }),
    },
    async ({ chain }) => {
      try {
        const rawKey = process.env.SENDER_PRIVATE_KEY;
        if (!rawKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'SENDER_PRIVATE_KEY is not set. Add it to your .env file and restart the MCP server.',
              },
            ],
            isError: true,
          };
        }

        const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
        const account = privateKeyToAccount(privateKey);
        const chainObj = SUPPORTED_CHAINS[chain];
        if (!chainObj) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Unsupported chain: ${chain}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`,
              },
            ],
            isError: true,
          };
        }

        const rpcUrl = process.env.RPC_URL;
        const client = createPublicClient({ chain: chainObj, transport: http(rpcUrl) });

        // Fetch ETH balance
        const ethBalance = await client.getBalance({ address: account.address });

        const lines = [
          `**Balances for** \`${account.address}\` **on ${chain}**`,
          ``,
          `ETH: ${formatEther(ethBalance)}`,
        ];

        // Fetch known token balances for this chain
        const chainTokens = STABLECOINS[chain];
        if (chainTokens && Object.keys(chainTokens).length > 0) {
          const tokenEntries = Object.entries(chainTokens);

          const results = await Promise.allSettled(
            tokenEntries.map(async ([symbol, address]) => {
              const [balance, decimals] = await Promise.all([
                client.readContract({
                  address: address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [account.address],
                }),
                client.readContract({
                  address: address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'decimals',
                }),
              ]);
              return { symbol, balance: balance as bigint, decimals: decimals as number };
            })
          );

          for (const result of results) {
            if (result.status === 'fulfilled') {
              const { symbol, balance, decimals } = result.value;
              const formatted = formatUnits(balance, decimals);
              if (balance > 0n) {
                lines.push(`${symbol}: ${formatted}`);
              } else {
                lines.push(`${symbol}: 0`);
              }
            }
          }
        }

        // Show tokens with nonzero balance first hint
        const hasTokens = lines.length > 3;
        if (!hasTokens) {
          lines.push(``, `No known tokens configured for ${chain}. You can still send any ERC-20 by contract address.`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching balances: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
