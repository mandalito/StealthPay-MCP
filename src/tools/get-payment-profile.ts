import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPaymentProfile } from '../lib/ens.js';

export function registerGetPaymentProfile(server: McpServer) {
  server.registerTool(
    'get-payment-profile',
    {
      title: 'Get Payment Profile',
      description:
        'Resolve an ENS name and fetch the recipient\'s payment profile: address, avatar, preferred chain/token, and stealth meta-address.',
      inputSchema: z.object({
        name: z.string().describe('ENS name (e.g. "vitalik.eth")'),
      }),
    },
    async ({ name }) => {
      try {
        const profile = await getPaymentProfile(name);

        // A name can exist without an addr record (e.g., only text records set)
        if (!profile.address && !profile.stealthMetaAddress) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Could not resolve ENS name "${name}". Make sure the name exists and is registered.`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          `**${profile.ensName}**`,
        ];

        if (profile.address) {
          lines.push(`Address: ${profile.address}`);
        } else {
          lines.push(`Address: not set (name exists but no ETH address record configured)`);
        }

        if (profile.avatar) lines.push(`Avatar: ${profile.avatar}`);
        if (profile.preferredChain) lines.push(`Preferred chain: ${profile.preferredChain}`);
        if (profile.preferredToken) lines.push(`Preferred token: ${profile.preferredToken}`);
        if (profile.description) lines.push(`Description: ${profile.description}`);

        if (profile.stealthMetaAddress) {
          lines.push(`Stealth meta-address: ${profile.stealthMetaAddress}`);
          lines.push(`\n✅ This recipient supports stealth payments.`);
        } else {
          lines.push(
            `\n⚠️ No stealth meta-address found. This recipient has not registered for stealth payments.`
          );
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error resolving "${name}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
