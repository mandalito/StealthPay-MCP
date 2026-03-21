import { config } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerGetPaymentProfile } from './tools/get-payment-profile.js';
import { registerGenerateStealthAddress } from './tools/generate-stealth-address.js';
import { registerSendStealthPayment } from './tools/send-stealth-payment.js';
import { registerCreatePaymentLink } from './tools/create-payment-link.js';
import { registerScanAnnouncements } from './tools/scan-announcements.js';
import { registerDeriveStealthKey } from './tools/derive-stealth-key.js';
import { registerWithdrawFromStealth } from './tools/withdraw-from-stealth.js';
import { registerRegisterEnsName } from './tools/register-ens-name.js';
import { registerRegisterStealthKeys } from './tools/register-stealth-keys.js';
import { registerGetMyProfile } from './tools/get-my-profile.js';
import { registerClaimStealthPayment } from './tools/claim-stealth-payment.js';
import { registerGenerateWallet } from './tools/generate-wallet.js';

// Load .env from DOTENV_PATH if set, otherwise default location
config({ path: process.env.DOTENV_PATH });

const server = new McpServer({
  name: 'stealthpay-mcp',
  version: '0.1.0',
});

// Register all tools — identity
registerGetMyProfile(server);
registerGenerateWallet(server);

// Register all tools — onboarding
registerRegisterEnsName(server);
registerRegisterStealthKeys(server);

// Register all tools — sender side
registerGetPaymentProfile(server);
registerGenerateStealthAddress(server);
registerSendStealthPayment(server);
registerCreatePaymentLink(server);

// Register all tools — recipient side
registerScanAnnouncements(server);
registerDeriveStealthKey(server);
registerWithdrawFromStealth(server);
registerClaimStealthPayment(server);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('StealthPay MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
