import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPaymentProfile } from '../lib/ens.js';

const paymentProfileOutputSchema = z.object({
  ensName: z.string(),
  address: z.string().nullable(),
  avatar: z.string().nullable(),
  description: z.string().nullable(),
  preferredChains: z.array(z.string()),
  preferredAssets: z.array(z.string()),
  preferredChain: z.string().nullable(),
  preferredToken: z.string().nullable(),
  stealthMetaAddress: z.string().nullable(),
  stealthPolicy: z.string(),
  stealthSupported: z.boolean(),
  notePolicy: z.string(),
  noteMaxBytes: z.number(),
  notePrivacy: z.string(),
});

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
      outputSchema: paymentProfileOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
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
        if (profile.description) lines.push(`Description: ${profile.description}`);

        // Chains and assets
        if (profile.preferredChains.length > 0) {
          lines.push(`Preferred chains: ${profile.preferredChains.join(', ')}${profile.preferredChain ? ` (${profile.preferredChain})` : ''}`);
        } else if (profile.preferredChain) {
          lines.push(`Preferred chain: ${profile.preferredChain}`);
        }
        if (profile.preferredAssets.length > 0) {
          lines.push(`Preferred assets: ${profile.preferredAssets.join(', ')}${profile.preferredToken ? ` (${profile.preferredToken})` : ''}`);
        } else if (profile.preferredToken) {
          lines.push(`Preferred token: ${profile.preferredToken}`);
        }

        // Stealth
        if (profile.stealthMetaAddress) {
          lines.push(`Stealth meta-address: ${profile.stealthMetaAddress}`);
          lines.push(`Stealth policy: ${profile.stealthPolicy}`);
          lines.push(`\n✅ This recipient supports stealth payments.`);
        } else {
          lines.push(
            `\n⚠️ No stealth meta-address found. This recipient has not registered for stealth payments.`
          );
        }

        // Note policy
        lines.push(`Note policy: ${profile.notePolicy} (max ${profile.noteMaxBytes} bytes, ${profile.notePrivacy})`);

        return {
          structuredContent: {
            ensName: profile.ensName,
            address: profile.address,
            avatar: profile.avatar,
            description: profile.description,
            preferredChains: profile.preferredChains,
            preferredAssets: profile.preferredAssets,
            preferredChain: profile.preferredChain,
            preferredToken: profile.preferredToken,
            stealthMetaAddress: profile.stealthMetaAddress,
            stealthPolicy: profile.stealthPolicy,
            stealthSupported: !!profile.stealthMetaAddress,
            notePolicy: profile.notePolicy,
            noteMaxBytes: profile.noteMaxBytes,
            notePrivacy: profile.notePrivacy,
          },
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
