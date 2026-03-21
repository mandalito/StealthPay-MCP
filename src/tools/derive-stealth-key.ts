import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deriveStealthPrivateKey } from '../lib/stealth.js';

export function registerDeriveStealthKey(server: McpServer) {
  server.registerTool(
    'derive-stealth-key',
    {
      title: 'Derive Stealth Private Key',
      description:
        'Derive the private key that controls a stealth address. Uses RECIPIENT_SPENDING_PRIVATE_KEY and RECIPIENT_VIEWING_PRIVATE_KEY from environment by default (keys never exposed to AI). WARNING: the output contains a private key — handle with care.',
      inputSchema: z.object({
        spendingPrivateKey: z
          .string()
          .optional()
          .describe('Spending private key (0x-prefixed hex). Defaults to RECIPIENT_SPENDING_PRIVATE_KEY env var.'),
        viewingPrivateKey: z
          .string()
          .optional()
          .describe('Viewing private key (0x-prefixed hex). Defaults to RECIPIENT_VIEWING_PRIVATE_KEY env var.'),
        ephemeralPublicKey: z
          .string()
          .describe('Ephemeral public key from the ERC-5564 announcement'),
        expectedAddress: z
          .string()
          .optional()
          .describe('Expected stealth address — used to verify correct derivation'),
      }),
    },
    async ({ spendingPrivateKey, viewingPrivateKey, ephemeralPublicKey, expectedAddress }) => {
      try {
        const resolvedSpendingKey = spendingPrivateKey || process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
        const resolvedViewingKey = viewingPrivateKey || process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

        if (!resolvedSpendingKey || !resolvedViewingKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Missing keys. Either set RECIPIENT_SPENDING_PRIVATE_KEY and RECIPIENT_VIEWING_PRIVATE_KEY in your .env file, or provide them as parameters.',
              },
            ],
            isError: true,
          };
        }

        const result = deriveStealthPrivateKey({
          spendingPrivateKey: (resolvedSpendingKey.startsWith('0x') ? resolvedSpendingKey : `0x${resolvedSpendingKey}`) as `0x${string}`,
          viewingPrivateKey: (resolvedViewingKey.startsWith('0x') ? resolvedViewingKey : `0x${resolvedViewingKey}`) as `0x${string}`,
          ephemeralPublicKey: ephemeralPublicKey as `0x${string}`,
          expectedAddress: expectedAddress as `0x${string}` | undefined,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Stealth private key derived successfully.`,
                ``,
                `Stealth address: \`${result.stealthAddress}\``,
                `Stealth private key: \`${result.stealthPrivateKey}\``,
                ``,
                `⚠️ This private key controls the funds at the stealth address. Store it securely.`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error deriving stealth key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
