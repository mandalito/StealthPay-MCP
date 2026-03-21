import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatUnits } from 'viem';
import { scanAnnouncements } from '../lib/scanner.js';
import { DEFAULT_CHAIN, SUPPORTED_CHAINS, explorerTxUrl } from '../config.js';

export function registerScanAnnouncements(server: McpServer) {
  server.registerTool(
    'scan-announcements',
    {
      title: 'Scan Stealth Announcements',
      description:
        'Scan ERC-5564 announcements to discover stealth payments for a recipient. Uses RECIPIENT_VIEWING_PRIVATE_KEY and RECIPIENT_SPENDING_PUBLIC_KEY from environment — keys never pass through AI.',
      inputSchema: z.object({
        chain: z
          .string()
          .default(DEFAULT_CHAIN)
          .describe(`Chain to scan (default: ${DEFAULT_CHAIN}). Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
        fromBlock: z
          .string()
          .optional()
          .describe('Start block number (defaults to recent ~50k blocks)'),
        toBlock: z
          .string()
          .optional()
          .describe('End block number (defaults to latest)'),
      }),
    },
    async ({ chain, fromBlock, toBlock }) => {
      try {
        const viewingKey = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
        const spendingPub = process.env.RECIPIENT_SPENDING_PUBLIC_KEY;

        if (!viewingKey || !spendingPub) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Missing keys. Set RECIPIENT_VIEWING_PRIVATE_KEY and RECIPIENT_SPENDING_PUBLIC_KEY in your .env file and restart the MCP server.',
              },
            ],
            isError: true,
          };
        }

        const payments = await scanAnnouncements({
          viewingPrivateKey: (viewingKey.startsWith('0x') ? viewingKey : `0x${viewingKey}`) as `0x${string}`,
          spendingPublicKey: (spendingPub.startsWith('0x') ? spendingPub : `0x${spendingPub}`) as `0x${string}`,
          chain,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
        });

        if (payments.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No stealth payments found on ${chain} in the scanned block range.`,
              },
            ],
          };
        }

        const lines = [
          `Found **${payments.length}** stealth payment(s) on ${chain}:`,
          '',
        ];

        for (const p of payments) {
          lines.push(`---`);
          lines.push(`Stealth address: \`${p.stealthAddress}\``);
          if (p.token && p.amount !== null) {
            lines.push(`Token: \`${p.token}\``);
            try {
              lines.push(`Amount: ${formatUnits(p.amount, 18)} (raw: ${p.amount})`);
            } catch {
              lines.push(`Amount (raw): ${p.amount}`);
            }
          }
          lines.push(`Block: ${p.blockNumber}`);
          lines.push(`Tx: ${explorerTxUrl(chain, p.txHash)}`);
          lines.push(`Ephemeral key: \`${p.ephemeralPublicKey}\``);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error scanning announcements: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
