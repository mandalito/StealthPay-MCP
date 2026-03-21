import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { registerStealthKeys } from '../lib/ens-register.js';
import { ENS_CONTRACTS } from '../config.js';

export function registerRegisterStealthKeys(server: McpServer) {
  server.registerTool(
    'register-stealth-keys',
    {
      title: 'Register Stealth Keys',
      description:
        'Generate spending and viewing keypairs, then set the stealth-meta-address text record on an ENS name. The caller must own/manage the ENS name. Private keys are saved directly to the .env file — they are never returned to the AI.',
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

        // Save keys directly to .env — never return private keys to AI
        const envPath = process.env.DOTENV_PATH || '.env';
        let envContent = '';
        if (existsSync(envPath)) {
          envContent = readFileSync(envPath, 'utf-8');
        }

        // Helper to set or update an env var in the file
        const setEnvVar = (content: string, key: string, value: string): string => {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(content)) {
            return content.replace(regex, `${key}=${value}`);
          }
          return content.trimEnd() + `\n${key}=${value}\n`;
        };

        envContent = setEnvVar(envContent, 'RECIPIENT_SPENDING_PRIVATE_KEY', result.spendingPrivateKey);
        envContent = setEnvVar(envContent, 'RECIPIENT_SPENDING_PUBLIC_KEY', result.spendingPublicKey);
        envContent = setEnvVar(envContent, 'RECIPIENT_VIEWING_PRIVATE_KEY', result.viewingPrivateKey);
        envContent = setEnvVar(envContent, 'RECIPIENT_VIEWING_PUBLIC_KEY', result.viewingPublicKey);

        writeFileSync(envPath, envContent);

        // Also set in current process so tools work without restart
        process.env.RECIPIENT_SPENDING_PRIVATE_KEY = result.spendingPrivateKey;
        process.env.RECIPIENT_SPENDING_PUBLIC_KEY = result.spendingPublicKey;
        process.env.RECIPIENT_VIEWING_PRIVATE_KEY = result.viewingPrivateKey;
        process.env.RECIPIENT_VIEWING_PUBLIC_KEY = result.viewingPublicKey;

        return {
          content: [{
            type: 'text' as const,
            text: [
              `Stealth keys registered for **${result.name}**`,
              '',
              `Tx: \`${result.txHash}\``,
              `Stealth meta-address: \`${result.stealthMetaAddress}\``,
              '',
              `✅ Keys saved to \`${envPath}\` automatically.`,
              `✅ /stealthpay-scan and /stealthpay-withdraw are ready to use (no restart needed).`,
              '',
              `Anyone can now send stealth payments to ${result.name}.`,
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
