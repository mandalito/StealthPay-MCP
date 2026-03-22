import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPaymentProfile } from '../lib/ens.js';
import { generateStealthAddress, parseStealthMetaAddressKeys } from '../lib/stealth.js';
import { sendToStealth } from '../lib/payments.js';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN, explorerTxUrl } from '../config.js';
import { checkPolicy, recordSpend } from '../lib/policy.js';

const sendOutputSchema = z.object({
  recipient: z.string(),
  amount: z.string(),
  token: z.string(),
  chain: z.string(),
  stealthAddress: z.string(),
  transferTxHash: z.string(),
  announceTxHash: z.string().nullable(),
  announceFailed: z.boolean(),
});

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
        memo: z
          .string()
          .optional()
          .describe('Optional payment note/memo. Encoded in the ERC-5564 announcement metadata so the recipient can read it when scanning.'),
      }),
      outputSchema: sendOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ to, amount, token, chain, memo }) => {
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

        // 1. Look up recipient profile (stealth meta-address + preferences + policy)
        const profile = await getPaymentProfile(to);

        // Check stealth policy
        if (profile.stealthPolicy === 'disabled') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `"${to}" has disabled stealth payments. Use a transparent payment method instead.`,
              },
            ],
            isError: true,
          };
        }

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

        // Validate note against recipient policy
        if (profile.notePolicy === 'required' && !memo) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `"${to}" requires a payment note. Add a memo to your payment.`,
              },
            ],
            isError: true,
          };
        }
        if (profile.notePolicy === 'none' && memo) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `"${to}" does not accept payment notes. Remove the memo and try again.`,
              },
            ],
            isError: true,
          };
        }
        // Validate note size
        const memoToSend = memo ?? undefined;
        if (memoToSend) {
          const memoBytes = new TextEncoder().encode(memoToSend).length;
          if (memoBytes > profile.noteMaxBytes) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Memo is ${memoBytes} bytes but "${to}" allows max ${profile.noteMaxBytes} bytes. Shorten your note.`,
                },
              ],
              isError: true,
            };
          }
        }

        // 2. Apply recipient preferences as defaults
        const resolvedChain = chain || profile.preferredChain || DEFAULT_CHAIN;
        const resolvedToken = token || profile.preferredToken || 'ETH';

        // 2b. Enforce agent spend policy
        const amountEth = resolvedToken.toUpperCase() === 'ETH' ? parseFloat(amount) : parseFloat(amount);
        const policyViolations = checkPolicy({
          amountEth,
          chain: resolvedChain,
          token: resolvedToken,
          destination: to,
        });
        if (policyViolations.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Transaction blocked by spend policy:\n${policyViolations.map(v => `- ${v.message}`).join('\n')}`,
              },
            ],
            isError: true,
          };
        }

        // 3. Generate one-time stealth address
        const stealth = generateStealthAddress(profile.stealthMetaAddress);

        // 4. Send funds + announce via ERC-5564
        // Parse recipient keys for note encryption if needed
        const recipientKeys = profile.notePrivacy !== 'plaintext' && profile.stealthMetaAddress
          ? parseStealthMetaAddressKeys(profile.stealthMetaAddress)
          : null;

        const { transferTxHash, announceTxHash, announceFailed, tokenLabel } = await sendToStealth({
          to: stealth.stealthAddress as `0x${string}`,
          amount,
          token: resolvedToken,
          chain: resolvedChain,
          privateKey,
          ephemeralPublicKey: stealth.ephemeralPublicKey as `0x${string}`,
          viewTag: stealth.viewTag as `0x${string}`,
          memo: memoToSend,
          notePrivacy: profile.notePrivacy,
          recipientViewPub: recipientKeys?.viewingPubKey,
          recipientSpendPub: recipientKeys?.spendingPubKey,
        });

        // Record spend for daily limit tracking
        recordSpend(amountEth);

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
          structuredContent: {
            recipient: to,
            amount,
            token: tokenLabel,
            chain: resolvedChain,
            stealthAddress: stealth.stealthAddress,
            transferTxHash,
            announceTxHash,
            announceFailed: !!announceFailed,
          },
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
