import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getStealthMetaAddress } from '../lib/ens.js';
import { generateStealthAddress } from '../lib/stealth.js';

const stealthAddressOutputSchema = z.object({
  stealthAddress: z.string(),
  ephemeralPublicKey: z.string(),
  viewTag: z.string(),
  recipient: z.string(),
});

export function registerGenerateStealthAddress(server: McpServer) {
  server.registerTool(
    'generate-stealth-address',
    {
      title: 'Generate Stealth Address',
      description:
        'Generate a one-time stealth address for a recipient using their ENS name. The resulting address can only be controlled by the recipient, but cannot be linked to their public identity.',
      inputSchema: z.object({
        name: z.string().describe('ENS name of the recipient (e.g. "vitalik.eth")'),
      }),
      outputSchema: stealthAddressOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
    },
    async ({ name }) => {
      try {
        // 1. Look up stealth meta-address from ENS
        const metaAddress = await getStealthMetaAddress(name);
        if (!metaAddress) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No stealth meta-address found for "${name}". The recipient needs to register their stealth keys via ENS text records or the ERC-6538 registry before they can receive stealth payments.`,
              },
            ],
            isError: true,
          };
        }

        // 2. Generate a one-time stealth address
        const result = generateStealthAddress(metaAddress);

        return {
          structuredContent: {
            stealthAddress: result.stealthAddress,
            ephemeralPublicKey: result.ephemeralPublicKey,
            viewTag: result.viewTag,
            recipient: name,
          },
          content: [
            {
              type: 'text' as const,
              text: [
                `Stealth address generated for **${name}**:`,
                ``,
                `Stealth address: \`${result.stealthAddress}\``,
                `Ephemeral public key: \`${result.ephemeralPublicKey}\``,
                `View tag: \`${result.viewTag}\``,
                ``,
                `This address is unlinkable to ${name}'s public identity. Send funds to this address, then announce the payment via the ERC-5564 contract so the recipient can discover it.`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error generating stealth address for "${name}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
