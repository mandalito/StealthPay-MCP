import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { privateKeyToAccount } from 'viem/accounts';
import { getPaymentProfile } from '../lib/ens.js';
import { SUPPORTED_CHAINS } from '../config.js';

export function registerGetMyProfile(server: McpServer) {
  server.registerTool(
    'get-my-profile',
    {
      title: 'Get My Profile',
      description:
        'Show your own wallet address, ENS name(s), and stealth payment profile. Reads SENDER_PRIVATE_KEY from environment — the key itself is never exposed.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const rawKey = process.env.SENDER_PRIVATE_KEY;
        if (!rawKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'SENDER_PRIVATE_KEY is not set. Add it to your .env file and restart the MCP server.',
              },
            ],
            isError: true,
          };
        }

        const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
        const account = privateKeyToAccount(privateKey);

        // Reverse-resolve ENS name from address
        const chainName = process.env.ENS_CHAIN;
        const chain = chainName ? SUPPORTED_CHAINS[chainName] ?? mainnet : mainnet;
        const client = createPublicClient({
          chain,
          transport: http(process.env.ENS_RPC_URL),
        });

        const ensName = await client.getEnsName({ address: account.address });

        const lines = [
          `**Your Wallet**`,
          ``,
          `Address: \`${account.address}\``,
        ];

        if (ensName) {
          lines.push(`ENS name: **${ensName}**`);

          // Fetch full payment profile
          const profile = await getPaymentProfile(ensName);

          if (profile.avatar) lines.push(`Avatar: ${profile.avatar}`);
          if (profile.description) lines.push(`Description: ${profile.description}`);
          if (profile.preferredChain) lines.push(`Preferred chain: ${profile.preferredChain}`);
          if (profile.preferredToken) lines.push(`Preferred token: ${profile.preferredToken}`);

          if (profile.stealthMetaAddress) {
            lines.push(``, `Stealth meta-address: \`${profile.stealthMetaAddress}\``);
            lines.push(`✅ Ready to receive stealth payments.`);
          } else {
            lines.push(``, `⚠️ No stealth keys registered. Run /setup to enable stealth payments.`);
          }
        } else {
          lines.push(``, `⚠️ No ENS name found for this address on ${chainName || 'mainnet'}.`);
          lines.push(`Run /setup to register an ENS name and stealth keys.`);
        }

        // Show which recipient keys are configured
        lines.push(``, `**Recipient Keys (for scanning)**`);
        const hasViewing = !!process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
        const hasSpendingPub = !!process.env.RECIPIENT_SPENDING_PUBLIC_KEY;
        const hasSpendingPriv = !!process.env.RECIPIENT_SPENDING_PRIVATE_KEY;

        lines.push(`Viewing private key: ${hasViewing ? '✅ configured' : '❌ not set'}`);
        lines.push(`Spending public key: ${hasSpendingPub ? '✅ configured' : '❌ not set'}`);
        lines.push(`Spending private key: ${hasSpendingPriv ? '✅ configured' : '❌ not set'}`);

        if (!hasViewing || !hasSpendingPub) {
          lines.push(``, `Add these to your .env file to enable /scan and /withdraw without exposing keys to AI.`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
