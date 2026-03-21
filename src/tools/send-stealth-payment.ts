import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getStealthMetaAddress } from '../lib/ens.js';
import { generateStealthAddress } from '../lib/stealth.js';
import { sendStablecoin } from '../lib/payments.js';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from '../config.js';

export function registerSendStealthPayment(server: McpServer) {
  server.registerTool(
    'send-stealth-payment',
    {
      title: 'Send Stealth Payment',
      description:
        'Send a private stablecoin payment to an ENS name using a stealth address. Generates a one-time address, sends the tokens, and announces the payment via ERC-5564 so the recipient can discover it.',
      inputSchema: z.object({
        to: z.string().describe('Recipient ENS name (e.g. "vitalik.eth")'),
        amount: z.string().describe('Amount to send (e.g. "100.00")'),
        token: z
          .string()
          .default('USDC')
          .describe('Stablecoin symbol (default: USDC)'),
        chain: z
          .string()
          .default(DEFAULT_CHAIN)
          .describe(`Chain to send on (default: ${DEFAULT_CHAIN}). Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
      }),
    },
    async ({ to, amount, token, chain }) => {
      try {
        // 0. Check for sender private key
        const rawKey = process.env.SENDER_PRIVATE_KEY;
        if (!rawKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'SENDER_PRIVATE_KEY environment variable is not set. Set it to the sender wallet\'s private key to enable payments.',
              },
            ],
            isError: true,
          };
        }
        const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;

        // 1. Look up stealth meta-address
        const metaAddress = await getStealthMetaAddress(to);
        if (!metaAddress) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No stealth meta-address found for "${to}". The recipient must register stealth keys before they can receive stealth payments.`,
              },
            ],
            isError: true,
          };
        }

        // 2. Generate one-time stealth address
        const stealth = generateStealthAddress(metaAddress);

        // 3. Send stablecoin + announce via ERC-5564
        const { transferTxHash, announceTxHash, announceFailed } = await sendStablecoin({
          to: stealth.stealthAddress as `0x${string}`,
          amount,
          token,
          chain,
          privateKey,
          ephemeralPublicKey: stealth.ephemeralPublicKey as `0x${string}`,
          viewTag: stealth.viewTag as `0x${string}`,
        });

        const lines = [
          `Stealth payment sent to **${to}**`,
          ``,
          `Amount: ${amount} ${token.toUpperCase()}`,
          `Chain: ${chain}`,
          `Stealth address: \`${stealth.stealthAddress}\``,
          `Transfer tx: \`${transferTxHash}\``,
        ];

        if (announceFailed) {
          lines.push(
            ``,
            `**WARNING: The ERC-5564 announcement transaction failed.**`,
            `The funds were sent but the recipient cannot discover them automatically.`,
            `Provide the following to the recipient so they can recover the funds:`,
            `Ephemeral public key: \`${stealth.ephemeralPublicKey}\``,
            `View tag: \`${stealth.viewTag}\``,
          );
        } else {
          lines.push(`Announcement tx: \`${announceTxHash}\``);
        }

        lines.push(
          ``,
          `The payment is private — the stealth address cannot be linked to ${to}'s public identity.`,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: lines.join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error sending stealth payment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
