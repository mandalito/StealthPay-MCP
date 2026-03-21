import { describe, it, expect } from 'vitest';
import { MockMcpServer } from './mcp-tool-test-utils.js';

// Import all tool registration functions (mirrors src/index.ts)
import { registerGetPaymentProfile } from '../../src/tools/get-payment-profile.js';
import { registerGenerateStealthAddress } from '../../src/tools/generate-stealth-address.js';
import { registerSendStealthPayment } from '../../src/tools/send-stealth-payment.js';
import { registerCreatePaymentLink } from '../../src/tools/create-payment-link.js';
import { registerScanAnnouncements } from '../../src/tools/scan-announcements.js';
import { registerRegisterEnsName } from '../../src/tools/register-ens-name.js';
import { registerRegisterStealthKeys } from '../../src/tools/register-stealth-keys.js';
import { registerGetMyProfile } from '../../src/tools/get-my-profile.js';
import { registerClaimStealthPayment } from '../../src/tools/claim-stealth-payment.js';
import { registerGenerateWallet } from '../../src/tools/generate-wallet.js';
import { registerGetBalances } from '../../src/tools/get-balances.js';
import { registerSetProfile } from '../../src/tools/set-profile.js';

const ALLOWED_TOOLS = [
  'get-my-profile',
  'generate-wallet',
  'get-balances',
  'register-ens-name',
  'register-stealth-keys',
  'set-profile',
  'get-payment-profile',
  'generate-stealth-address',
  'send-stealth-payment',
  'create-payment-link',
  'scan-announcements',
  'claim-stealth-payment',
];

const FORBIDDEN_TOOLS = [
  'derive-stealth-key',
  'withdraw-from-stealth',
  'set-wallet',
];

describe('Registered tool list', () => {
  const server = new MockMcpServer();

  // Register all tools exactly as index.ts does
  registerGetMyProfile(server as unknown as any);
  registerGenerateWallet(server as unknown as any);
  registerGetBalances(server as unknown as any);
  registerRegisterEnsName(server as unknown as any);
  registerRegisterStealthKeys(server as unknown as any);
  registerGetPaymentProfile(server as unknown as any);
  registerGenerateStealthAddress(server as unknown as any);
  registerSendStealthPayment(server as unknown as any);
  registerCreatePaymentLink(server as unknown as any);
  registerScanAnnouncements(server as unknown as any);
  registerClaimStealthPayment(server as unknown as any);
  registerSetProfile(server as unknown as any);

  const registeredNames = Array.from(server.tools.keys());

  it('registers exactly the allowed tools', () => {
    expect(registeredNames.sort()).toEqual(ALLOWED_TOOLS.sort());
  });

  for (const name of FORBIDDEN_TOOLS) {
    it(`does NOT register ${name} (private key leakage risk)`, () => {
      expect(registeredNames).not.toContain(name);
    });
  }
});
