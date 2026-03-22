import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerEnsName } from '../lib/ens-register.js';
import { ENS_CONTRACTS, explorerTxUrl } from '../config.js';

const ensRegisterOutputSchema = z.object({
  name: z.string(),
  owner: z.string(),
  cost: z.string(),
  expiresIn: z.string(),
  commitTxHash: z.string(),
  registerTxHash: z.string(),
  chain: z.string(),
});

export function registerRegisterEnsName(server: McpServer) {
  server.registerTool(
    'register-ens-name',
    {
      title: 'Register ENS Name',
      description:
        'Register a new .eth ENS name. Checks availability, computes cost, and completes the commit-wait-register flow. Takes ~65 seconds due to the commitment waiting period. Uses SENDER_PRIVATE_KEY from environment.',
      outputSchema: ensRegisterOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      inputSchema: z.object({
        label: z
          .string()
          .describe('Name to register (without .eth suffix, e.g. "myname")'),
        chain: z
          .string()
          .default('sepolia')
          .describe(`Chain for ENS registration. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`),
        years: z
          .number()
          .default(1)
          .describe('Registration duration in years (default: 1)'),
      }),
    },
    async ({ label, chain, years }) => {
      try {
        const privateKey = process.env.SENDER_PRIVATE_KEY as `0x${string}` | undefined;
        if (!privateKey) {
          return {
            content: [{
              type: 'text' as const,
              text: 'SENDER_PRIVATE_KEY environment variable is not set.',
            }],
            isError: true,
          };
        }

        const statusMessages: string[] = [];
        const result = await registerEnsName(
          {
            label,
            privateKey: (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`,
            chain,
            duration: BigInt(years) * 31_536_000n,
          },
          (msg) => statusMessages.push(msg),
        );

        return {
          structuredContent: {
            name: result.name,
            owner: result.owner,
            cost: result.cost,
            expiresIn: result.expiresIn,
            commitTxHash: result.commitTxHash,
            registerTxHash: result.registerTxHash,
            chain,
          },
          content: [{
            type: 'text' as const,
            text: [
              `**${result.name}** registered successfully!`,
              '',
              `Owner: \`${result.owner}\``,
              `Cost: ${result.cost}`,
              `Duration: ${result.expiresIn}`,
              `Commit tx: ${explorerTxUrl(chain, result.commitTxHash)}`,
              `Register tx: ${explorerTxUrl(chain, result.registerTxHash)}`,
              '',
              `Next step: use \`register-stealth-keys\` to generate and link stealth keys to this name.`,
            ].join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error registering ENS name: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
