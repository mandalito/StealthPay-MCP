import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPaymentLink } from '../lib/payments.js';

export function registerCreatePaymentLink(server: McpServer) {
  server.registerTool(
    'create-payment-link',
    {
      title: 'Create Payment Link',
      description:
        'Generate a shareable payment link for an ENS name. The link resolves to a stealth address at payment time, ensuring privacy.',
      inputSchema: z.object({
        to: z.string().describe('Recipient ENS name (e.g. "vitalik.eth")'),
        amount: z.string().optional().describe('Suggested amount (e.g. "50.00")'),
        token: z.string().optional().describe('Token symbol (e.g. "USDC")'),
        chain: z.string().optional().describe('Preferred chain (e.g. "base")'),
        memo: z.string().optional().describe('Optional memo for the payment'),
      }),
    },
    async ({ to, amount, token, chain, memo }) => {
      try {
        const link = createPaymentLink({ to, amount, token, chain, memo });

        const lines = [
          `**Payment link created**`,
          ``,
          `Link: ${link}`,
          ``,
          `Recipient: ${to}`,
        ];
        if (amount) lines.push(`Amount: ${amount}${token ? ` ${token}` : ''}`);
        if (chain) lines.push(`Chain: ${chain}`);
        if (memo) lines.push(`Memo: ${memo}`);
        lines.push(
          ``,
          `When someone opens this link, a fresh stealth address will be generated for ${to}, ensuring the payment is private.`
        );

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating payment link: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
