import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const walletOutputSchema = z.object({
  address: z.string(),
  alreadyExisted: z.boolean(),
});

export function registerGenerateWallet(server: McpServer) {
  server.registerTool(
    'generate-wallet',
    {
      title: 'Generate Wallet',
      description:
        'Generate a new wallet keypair and save it to .env. The private key never leaves the Node.js process — only the address is returned. Will NOT overwrite an existing SENDER_PRIVATE_KEY.',
      inputSchema: z.object({}),
      outputSchema: walletOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async () => {
      try {
        // Check if a key already exists
        const existingKey = process.env.SENDER_PRIVATE_KEY;
        if (existingKey) {
          const existingAccount = privateKeyToAccount(
            (existingKey.startsWith('0x') ? existingKey : `0x${existingKey}`) as `0x${string}`
          );
          return {
            structuredContent: {
              address: existingAccount.address,
              alreadyExisted: true,
            },
            content: [
              {
                type: 'text' as const,
                text: [
                  `A wallet is already configured.`,
                  ``,
                  `Address: \`${existingAccount.address}\``,
                  ``,
                  `To generate a new wallet, first remove SENDER_PRIVATE_KEY from your .env file, then try again.`,
                ].join('\n'),
              },
            ],
          };
        }

        // Generate new keypair
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);

        // Save to .env
        const envPath = process.env.DOTENV_PATH || '.env';
        let envContent = '';
        if (existsSync(envPath)) {
          envContent = readFileSync(envPath, 'utf-8');
        }

        envContent = envContent.trimEnd() + `\nSENDER_PRIVATE_KEY=${privateKey}\n`;
        writeFileSync(envPath, envContent);

        // Set in current process
        process.env.SENDER_PRIVATE_KEY = privateKey;

        return {
          structuredContent: {
            address: account.address,
            alreadyExisted: false,
          },
          content: [
            {
              type: 'text' as const,
              text: [
                `New wallet generated and saved to \`${envPath}\`.`,
                ``,
                `Address: \`${account.address}\``,
                ``,
                `The private key is stored in your .env file only — it was never exposed to the AI.`,
                `Fund this address with testnet ETH to start using StealthPay.`,
              ].join('\n'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error generating wallet: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
