import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { registerStealthKeysMock } = vi.hoisted(() => ({
  registerStealthKeysMock: vi.fn(),
}));

vi.mock('../../src/lib/ens-register.js', () => ({
  registerStealthKeys: registerStealthKeysMock,
}));

import { registerRegisterStealthKeys } from '../../src/tools/register-stealth-keys.js';

describe('tool:register-stealth-keys', () => {
  const originalSender = process.env.SENDER_PRIVATE_KEY;
  const originalDotenvPath = process.env.DOTENV_PATH;

  let tempDir: string;
  let envPath: string;

  beforeEach(() => {
    registerStealthKeysMock.mockReset();
    process.env.SENDER_PRIVATE_KEY = originalSender;
    process.env.DOTENV_PATH = originalDotenvPath;

    tempDir = mkdtempSync(join(tmpdir(), 'stealthpay-tools-'));
    envPath = join(tempDir, '.env');
    writeFileSync(envPath, 'ENS_CHAIN=sepolia\n', 'utf-8');
    process.env.DOTENV_PATH = envPath;

    delete process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
    delete process.env.RECIPIENT_SPENDING_PUBLIC_KEY;
    delete process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
    delete process.env.RECIPIENT_VIEWING_PUBLIC_KEY;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails when sender key is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerRegisterStealthKeys, 'register-stealth-keys');
    const result = await handler({ name: 'alice.eth', chain: 'sepolia' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY environment variable is not set');
  });

  it('writes recipient keys to DOTENV_PATH and process env', async () => {
    process.env.SENDER_PRIVATE_KEY = '2'.repeat(64); // no 0x

    registerStealthKeysMock.mockResolvedValue({
      name: 'alice.eth',
      txHash: '0xtx',
      registryTxHash: '0xregistry',
      stealthMetaAddress: 'st:sep:0xabc',
      spendingPrivateKey: '0x' + '3'.repeat(64),
      spendingPublicKey: '0x02' + '4'.repeat(64),
      viewingPrivateKey: '0x' + '5'.repeat(64),
      viewingPublicKey: '0x03' + '6'.repeat(64),
    });

    const { handler } = registerAndGetTool(registerRegisterStealthKeys, 'register-stealth-keys');
    const result = await handler({ name: 'alice.eth', chain: 'sepolia' });

    expect(result.isError).toBeUndefined();
    expect(registerStealthKeysMock).toHaveBeenCalledWith({
      name: 'alice.eth',
      privateKey: '0x' + '2'.repeat(64),
      chain: 'sepolia',
    });

    const env = readFileSync(envPath, 'utf-8');
    expect(env).toContain('RECIPIENT_SPENDING_PRIVATE_KEY=0x' + '3'.repeat(64));
    expect(env).toContain('RECIPIENT_SPENDING_PUBLIC_KEY=0x02' + '4'.repeat(64));
    expect(env).toContain('RECIPIENT_VIEWING_PRIVATE_KEY=0x' + '5'.repeat(64));
    expect(env).toContain('RECIPIENT_VIEWING_PUBLIC_KEY=0x03' + '6'.repeat(64));

    expect(process.env.RECIPIENT_SPENDING_PRIVATE_KEY).toBe('0x' + '3'.repeat(64));
    expect(result.content[0].text).toContain(`✅ Keys saved to \`${envPath}\` automatically.`);
    expect(result.content[0].text).not.toContain('3'.repeat(10)); // private key not echoed
  });
});
