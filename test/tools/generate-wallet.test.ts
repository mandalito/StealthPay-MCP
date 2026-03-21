import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { generatePrivateKeyMock, privateKeyToAccountMock } = vi.hoisted(() => ({
  generatePrivateKeyMock: vi.fn(),
  privateKeyToAccountMock: vi.fn(),
}));

vi.mock('viem/accounts', () => ({
  generatePrivateKey: generatePrivateKeyMock,
  privateKeyToAccount: privateKeyToAccountMock,
}));

import { registerGenerateWallet } from '../../src/tools/generate-wallet.js';

describe('tool:generate-wallet', () => {
  const originalSender = process.env.SENDER_PRIVATE_KEY;
  const originalDotenvPath = process.env.DOTENV_PATH;

  let tempDir: string;
  let envPath: string;

  beforeEach(() => {
    generatePrivateKeyMock.mockReset();
    privateKeyToAccountMock.mockReset();

    process.env.SENDER_PRIVATE_KEY = originalSender;
    process.env.DOTENV_PATH = originalDotenvPath;

    tempDir = mkdtempSync(join(tmpdir(), 'stealthpay-wallet-'));
    envPath = join(tempDir, '.env');
    writeFileSync(envPath, 'ENS_CHAIN=sepolia\n', 'utf-8');
    process.env.DOTENV_PATH = envPath;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns existing wallet info when SENDER_PRIVATE_KEY is already set', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    privateKeyToAccountMock.mockReturnValue({
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    const { handler } = registerAndGetTool(registerGenerateWallet, 'generate-wallet');
    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('A wallet is already configured.');
    expect(result.content[0].text).toContain('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(generatePrivateKeyMock).not.toHaveBeenCalled();
  });

  it('generates and persists a new sender key', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const generated = '0x' + '2'.repeat(64);
    generatePrivateKeyMock.mockReturnValue(generated);
    privateKeyToAccountMock.mockReturnValue({
      address: '0xcccccccccccccccccccccccccccccccccccccccc',
    });

    const { handler } = registerAndGetTool(registerGenerateWallet, 'generate-wallet');
    const result = await handler({});

    const env = readFileSync(envPath, 'utf-8');
    expect(env).toContain(`SENDER_PRIVATE_KEY=${generated}`);
    expect(process.env.SENDER_PRIVATE_KEY).toBe(generated);
    expect(result.content[0].text).toContain(`New wallet generated and saved to \`${envPath}\`.`);
    expect(result.content[0].text).toContain('0xcccccccccccccccccccccccccccccccccccccccc');
  });
});
