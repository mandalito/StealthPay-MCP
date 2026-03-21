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
        'Scan ERC-5564 announcements to discover stealth payments for a recipient. Uses RECIPIENT_VIEWING_PRIVATE_KEY and RECIPIENT_SPENDING_PUBLIC_KEY from environment by default (keys never exposed to AI). Override with explicit parameters if scanning for someone else.',
      inputSchema: z.object({
        viewingPrivateKey: z
          .string()
          .optional()
          .describe('Viewing private key (0x-prefixed hex). Defaults to RECIPIENT_VIEWING_PRIVATE_KEY env var.'),
        spendingPublicKey: z
          .string()
          .optional()
          .describe('Spending public key (0x-prefixed compressed hex). Defaults to RECIPIENT_SPENDING_PUBLIC_KEY env var.'),
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
    async ({ viewingPrivateKey, spendingPublicKey, chain, fromBlock, toBlock }) => {
      try {
        const resolvedViewingKey = viewingPrivateKey || process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
        const resolvedSpendingPub = spendingPublicKey || process.env.RECIPIENT_SPENDING_PUBLIC_KEY;

        if (!resolvedViewingKey || !resolvedSpendingPub) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Missing keys. Either set RECIPIENT_VIEWING_PRIVATE_KEY and RECIPIENT_SPENDING_PUBLIC_KEY in your .env file, or provide them as parameters.',
              },
            ],
            isError: true,
          };
        }

        const payments = await scanAnnouncements({
          viewingPrivateKey: (resolvedViewingKey.startsWith('0x') ? resolvedViewingKey : `0x${resolvedViewingKey}`) as `0x${string}`,
          spendingPublicKey: (resolvedSpendingPub.startsWith('0x') ? resolvedSpendingPub : `0x${resolvedSpendingPub}`) as `0x${string}`,
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
            // Try to format assuming 18 decimals, fall back to raw
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
