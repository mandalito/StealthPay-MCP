import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deriveStealthPrivateKey } from '../lib/stealth.js';

export function registerDeriveStealthKey(server: McpServer) {
  server.registerTool(
    'derive-stealth-key',
    {
      title: 'Derive Stealth Private Key',
      description:
        'Derive the private key that controls a stealth address. Requires the recipient\'s spending and viewing private keys, plus the ephemeral public key from the announcement. WARNING: the output contains a private key — handle with care.',
      inputSchema: z.object({
        spendingPrivateKey: z
          .string()
          .describe('Recipient spending private key (0x-prefixed hex)'),
        viewingPrivateKey: z
          .string()
          .describe('Recipient viewing private key (0x-prefixed hex)'),
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
        const result = deriveStealthPrivateKey({
          spendingPrivateKey: spendingPrivateKey as `0x${string}`,
          viewingPrivateKey: viewingPrivateKey as `0x${string}`,
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
