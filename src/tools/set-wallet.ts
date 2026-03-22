import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { privateKeyToAccount } from 'viem/accounts';

export function registerSetWallet(server: McpServer) {
  server.registerTool(
    'set-wallet',
    {
      title: 'Set Wallet',
      description:
        'Set the sender wallet private key for this session. The key is stored in memory only — it is NOT written to disk. Required for tools that send transactions (register-ens-name, register-stealth-keys, send-stealth-payment).',
      inputSchema: z.object({
        privateKey: z
          .string()
          .describe('Private key (0x-prefixed hex, 32 bytes). Handle with care.'),
      }),
    },
    async ({ privateKey }) => {
      try {
        const key = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`;

        // Validate the key by deriving the account
        const account = privateKeyToAccount(key);

        // Set in process env for other tools to use
        process.env.SENDER_PRIVATE_KEY = key;

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Wallet set for this session.`,
                ``,
                `Address: \`${account.address}\``,
                ``,
                `This key is in memory only and will be cleared when the MCP server restarts. Tools that send transactions will now use this wallet.`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid private key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
