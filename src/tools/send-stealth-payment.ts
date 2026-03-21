import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPaymentProfile } from '../lib/ens.js';
import { generateStealthAddress } from '../lib/stealth.js';
import { sendToStealth } from '../lib/payments.js';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN, explorerTxUrl } from '../config.js';

export function registerSendStealthPayment(server: McpServer) {
  server.registerTool(
    'send-stealth-payment',
    {
      title: 'Send Stealth Payment',
      description:
        'Send a private payment to an ENS name using a stealth address. Supports native ETH, known stablecoins (USDC, USDT, DAI), or any ERC-20 by contract address. Generates a one-time address, sends the funds, and announces via ERC-5564.',
      inputSchema: z.object({
        to: z.string().describe('Recipient ENS name (e.g. "vitalik.eth")'),
        amount: z.string().describe('Amount to send (e.g. "0.01" or "100.00")'),
        token: z
          .string()
          .optional()
          .describe('Token: "ETH" for native, a symbol like "USDC", or a 0x ERC-20 contract address. If omitted, uses the recipient\'s preferred token or defaults to ETH.'),
        chain: z
          .string()
          .optional()
          .describe(`Chain to send on. If omitted, uses the recipient's preferred chain or defaults to ${DEFAULT_CHAIN}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`),
      }),
    },
    async ({ to, amount, token, chain }) => {
      try {
        const rawKey = process.env.SENDER_PRIVATE_KEY;
        if (!rawKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'SENDER_PRIVATE_KEY environment variable is not set. Add it to your .env file and restart the MCP server.',
              },
            ],
            isError: true,
          };
        }
        const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;

        // 1. Look up recipient profile (stealth meta-address + preferences)
        const profile = await getPaymentProfile(to);
        if (!profile.stealthMetaAddress) {
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

        // 2. Apply recipient preferences as defaults
        const resolvedChain = chain || profile.preferredChain || DEFAULT_CHAIN;
        const resolvedToken = token || profile.preferredToken || 'ETH';

        // 3. Generate one-time stealth address
        const stealth = generateStealthAddress(profile.stealthMetaAddress);

        // 4. Send funds + announce via ERC-5564
        const { transferTxHash, announceTxHash, announceFailed, tokenLabel } = await sendToStealth({
          to: stealth.stealthAddress as `0x${string}`,
          amount,
          token: resolvedToken,
          chain: resolvedChain,
          privateKey,
          ephemeralPublicKey: stealth.ephemeralPublicKey as `0x${string}`,
          viewTag: stealth.viewTag as `0x${string}`,
        });

        const lines = [
          `Stealth payment sent to **${to}**`,
          ``,
          `Amount: ${amount} ${tokenLabel}`,
          `Chain: ${resolvedChain}${profile.preferredChain && !chain ? ` (recipient preference)` : ''}`,
          `Stealth address: \`${stealth.stealthAddress}\``,
          `Transfer tx: ${explorerTxUrl(resolvedChain, transferTxHash)}`,
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
          lines.push(`Announcement tx: ${explorerTxUrl(resolvedChain, announceTxHash!)}`);
        }

        lines.push(
          ``,
          `The payment is private — the stealth address cannot be linked to ${to}'s public identity.`,
        );

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
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
