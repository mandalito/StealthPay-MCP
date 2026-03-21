import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerStealthKeys } from '../lib/ens-register.js';
import { ENS_CONTRACTS } from '../config.js';

export function registerRegisterStealthKeys(server: McpServer) {
  server.registerTool(
    'register-stealth-keys',
    {
      title: 'Register Stealth Keys',
      description:
        'Generate spending and viewing keypairs, then set the stealth-meta-address text record on an ENS name. The caller must own/manage the ENS name. WARNING: The output contains private keys — save them securely.',
      inputSchema: z.object({
        name: z
          .string()
          .describe('ENS name to set stealth keys on (e.g. "myname.eth")'),
        chain: z
          .string()
          .default('sepolia')
          .describe(`Chain where the ENS name is registered. Supported: ${Object.keys(ENS_CONTRACTS).join(', ')}`),
      }),
    },
    async ({ name, chain }) => {
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

        const result = await registerStealthKeys({
          name,
          privateKey: (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`,
          chain,
        });

        return {
          content: [{
            type: 'text' as const,
            text: [
              `Stealth keys registered for **${result.name}**`,
              '',
              `Tx: \`${result.txHash}\``,
              `Stealth meta-address: \`${result.stealthMetaAddress}\``,
              '',
              `**SAVE THESE KEYS SECURELY:**`,
              `Spending private key: \`${result.spendingPrivateKey}\``,
              `Spending public key:  \`${result.spendingPublicKey}\``,
              `Viewing private key:  \`${result.viewingPrivateKey}\``,
              `Viewing public key:   \`${result.viewingPublicKey}\``,
              '',
              `Anyone can now send stealth payments to ${result.name}.`,
              `You need the spending + viewing private keys to discover and claim payments.`,
            ].join('\n'),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error registering stealth keys: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
