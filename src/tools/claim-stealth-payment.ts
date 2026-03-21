import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deriveStealthPrivateKey } from '../lib/stealth.js';
import { withdrawFromStealth } from '../lib/withdraw.js';
import { DEFAULT_CHAIN, SUPPORTED_CHAINS, explorerTxUrl } from '../config.js';

export function registerClaimStealthPayment(server: McpServer) {
  server.registerTool(
    'claim-stealth-payment',
    {
      title: 'Claim Stealth Payment',
      description:
        'Derive the stealth private key and withdraw funds in one step. Uses RECIPIENT_SPENDING_PRIVATE_KEY and RECIPIENT_VIEWING_PRIVATE_KEY from environment — private keys never pass through AI. Only the ephemeral public key (from scan-announcements) and destination address are needed.',
      inputSchema: z.object({
        ephemeralPublicKey: z
          .string()
          .describe('Ephemeral public key from the ERC-5564 announcement (from scan-announcements output)'),
        to: z
          .string()
          .describe('Destination address to receive funds (0x-prefixed)'),
        token: z
          .string()
          .describe('Token to withdraw: "ETH" for native, or ERC-20 contract address'),
        amount: z
          .string()
          .optional()
          .describe('Amount to withdraw (human-readable). Omit to withdraw full balance.'),
        chain: z
          .string()
          .default(DEFAULT_CHAIN)
          .describe(`Chain (default: ${DEFAULT_CHAIN}). Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
      }),
    },
    async ({ ephemeralPublicKey, to, token, amount, chain }) => {
      try {
        const spendingPrivateKey = process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
        const viewingPrivateKey = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

        if (!spendingPrivateKey || !viewingPrivateKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Missing keys. Set RECIPIENT_SPENDING_PRIVATE_KEY and RECIPIENT_VIEWING_PRIVATE_KEY in your .env file and restart the MCP server.',
              },
            ],
            isError: true,
          };
        }

        // Step 1: Derive the stealth private key (never leaves this process)
        const derived = deriveStealthPrivateKey({
          spendingPrivateKey: (spendingPrivateKey.startsWith('0x') ? spendingPrivateKey : `0x${spendingPrivateKey}`) as `0x${string}`,
          viewingPrivateKey: (viewingPrivateKey.startsWith('0x') ? viewingPrivateKey : `0x${viewingPrivateKey}`) as `0x${string}`,
          ephemeralPublicKey: (ephemeralPublicKey.startsWith('0x') ? ephemeralPublicKey : `0x${ephemeralPublicKey}`) as `0x${string}`,
        });

        // Step 2: Withdraw funds using the derived key
        const result = await withdrawFromStealth({
          stealthPrivateKey: derived.stealthPrivateKey as `0x${string}`,
          to: to as `0x${string}`,
          token: token === 'ETH' ? 'ETH' : token as `0x${string}`,
          amount,
          chain,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Stealth payment claimed successfully.`,
                ``,
                `From: \`${result.from}\` (stealth address)`,
                `To: \`${result.to}\``,
                `Amount: ${result.amount} ${result.token}`,
                `Tx: ${explorerTxUrl(chain, result.txHash)}`,
                `Chain: ${chain}`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error claiming payment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
