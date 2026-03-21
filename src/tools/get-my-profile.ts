import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getPaymentProfile } from '../lib/ens.js';
import { SUPPORTED_CHAINS, explorerAddressUrl } from '../config.js';

// ENS subgraph URLs per chain
const ENS_SUBGRAPH: Record<string, string> = {
  ethereum: 'https://api.thegraph.com/subgraphs/name/ensdomains/ens',
  sepolia: 'https://api.studio.thegraph.com/query/49574/enssepolia/version/latest',
};

/**
 * Query the ENS subgraph to find all ENS names owned by an address.
 */
async function getEnsNamesForAddress(address: string, chainName: string): Promise<string[]> {
  const subgraphUrl = ENS_SUBGRAPH[chainName];
  if (!subgraphUrl) return [];

  try {
    const query = `{
      domains(where: { owner: "${address.toLowerCase()}" }) {
        name
      }
    }`;

    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) return [];

    const data = await response.json() as { data?: { domains?: Array<{ name: string }> } };
    return (data.data?.domains ?? [])
      .map((d) => d.name)
      .filter((name) => name && name.endsWith('.eth'));
  } catch {
    return [];
  }
}

export function registerGetMyProfile(server: McpServer) {
  server.registerTool(
    'get-my-profile',
    {
      title: 'Get My Profile',
      description:
        'Show your own wallet address, all ENS names you own, and stealth payment profile. Reads SENDER_PRIVATE_KEY from environment — the key itself is never exposed.',
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
        const chainName = process.env.ENS_CHAIN || 'ethereum';
        const chain = SUPPORTED_CHAINS[chainName] ?? mainnet;

        const client = createPublicClient({
          chain,
          transport: http(process.env.ENS_RPC_URL),
        });

        // Fetch primary ENS name and all owned names in parallel
        const [primaryName, ownedNames] = await Promise.all([
          client.getEnsName({ address: account.address }).catch(() => null),
          getEnsNamesForAddress(account.address, chainName),
        ]);

        const lines = [
          `**Your Wallet**`,
          ``,
          `Address: \`${account.address}\``,
          `Explorer: ${explorerAddressUrl(chainName, account.address)}`,
        ];

        if (primaryName) {
          lines.push(`Primary ENS: **${primaryName}**`);
        }

        // Show all owned names
        if (ownedNames.length > 0) {
          lines.push(``, `**ENS Names Owned** (${ownedNames.length}):`);
          for (const name of ownedNames) {
            const isPrimary = name === primaryName ? ' ← primary' : '';
            lines.push(`- ${name}${isPrimary}`);
          }
        } else if (!primaryName) {
          lines.push(``, `No ENS names found on ${chainName}.`);
          lines.push(`Run /stealthpay-setup to register one.`);
        }

        // Show stealth profile for primary name
        if (primaryName) {
          const profile = await getPaymentProfile(primaryName);

          if (profile.avatar) lines.push(``, `Avatar: ${profile.avatar}`);
          if (profile.description) lines.push(`Description: ${profile.description}`);

          if (profile.stealthMetaAddress) {
            lines.push(``, `Stealth meta-address: \`${profile.stealthMetaAddress}\``);
            lines.push(`✅ Ready to receive stealth payments.`);
          } else {
            lines.push(``, `⚠️ No stealth keys registered on ${primaryName}. Run /stealthpay-setup to enable stealth payments.`);
          }
        } else if (ownedNames.length > 0) {
          // Check stealth keys on the first owned name
          const firstProfile = await getPaymentProfile(ownedNames[0]);
          if (firstProfile.stealthMetaAddress) {
            lines.push(``, `Stealth keys found on **${ownedNames[0]}**: \`${firstProfile.stealthMetaAddress}\``);
            lines.push(`✅ Ready to receive stealth payments.`);
          } else {
            lines.push(``, `⚠️ No stealth keys registered on any name. Run /stealthpay-setup.`);
          }
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
          lines.push(``, `Add these to your .env file to enable /stealthpay-scan and /stealthpay-withdraw without exposing keys to AI.`);
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
