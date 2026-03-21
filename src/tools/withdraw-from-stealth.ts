import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { withdrawFromStealth } from '../lib/withdraw.js';
import { DEFAULT_CHAIN, SUPPORTED_CHAINS, explorerTxUrl } from '../config.js';

export function registerWithdrawFromStealth(server: McpServer) {
  server.registerTool(
    'withdraw-from-stealth',
    {
      title: 'Withdraw from Stealth Address',
      description:
        'Transfer funds out of a stealth address to a destination wallet. Supports ERC-20 tokens and native ETH. The stealth address must have ETH for gas (send a small amount first if needed).',
      inputSchema: z.object({
        stealthPrivateKey: z
          .string()
          .describe('Private key of the stealth address (from derive-stealth-key)'),
        to: z
          .string()
          .describe('Destination address (0x-prefixed)'),
        token: z
          .string()
          .describe('Token to withdraw: "ETH" for native, or ERC-20 contract address'),
        amount: z
          .string()
          .optional()
          .describe('Amount to withdraw (human-readable). Omit to withdraw full balance.'),
        chain: z
          .string()
          .default(DEFAULT_CHAIN)
          .describe(`Chain (default: ${DEFAULT_CHAIN}). Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
      }),
    },
    async ({ stealthPrivateKey, to, token, amount, chain }) => {
      try {
        const result = await withdrawFromStealth({
          stealthPrivateKey: stealthPrivateKey as `0x${string}`,
          to: to as `0x${string}`,
          token: token === 'ETH' ? 'ETH' : token as `0x${string}`,
          amount,
          chain,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Withdrawal successful.`,
                ``,
                `From: \`${result.from}\` (stealth address)`,
                `To: \`${result.to}\``,
                `Amount: ${result.amount} ${result.token}`,
                `Tx: ${explorerTxUrl(chain, result.txHash)}`,
                `Chain: ${chain}`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error withdrawing: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
