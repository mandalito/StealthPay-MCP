import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { deriveStealthPrivateKeyMock } = vi.hoisted(() => ({
  deriveStealthPrivateKeyMock: vi.fn(),
}));

vi.mock('../../src/lib/stealth.js', () => ({
  deriveStealthPrivateKey: deriveStealthPrivateKeyMock,
}));

import { registerDeriveStealthKey } from '../../src/tools/derive-stealth-key.js';

describe('tool:derive-stealth-key', () => {
  const originalSpend = process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
  const originalView = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

  beforeEach(() => {
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = originalSpend;
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = originalView;
    deriveStealthPrivateKeyMock.mockReset();
  });

  it('fails when no keys are provided and env keys are missing', async () => {
    delete process.env.RECIPIENT_SPENDING_PRIVATE_KEY;
    delete process.env.RECIPIENT_VIEWING_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerDeriveStealthKey, 'derive-stealth-key');
    const result = await handler({ ephemeralPublicKey: '0x02aa' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing keys');
  });

  it('uses env keys, derives, and returns private key output', async () => {
    process.env.RECIPIENT_SPENDING_PRIVATE_KEY = '1'.repeat(64); // no 0x
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = '2'.repeat(64); // no 0x

    deriveStealthPrivateKeyMock.mockReturnValue({
      stealthAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      stealthPrivateKey: '0x' + '3'.repeat(64),
    });

    const { handler } = registerAndGetTool(registerDeriveStealthKey, 'derive-stealth-key');
    const result = await handler({ ephemeralPublicKey: '0x02aa' });

    expect(result.isError).toBeUndefined();
    expect(deriveStealthPrivateKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spendingPrivateKey: '0x' + '1'.repeat(64),
        viewingPrivateKey: '0x' + '2'.repeat(64),
        ephemeralPublicKey: '0x02aa',
      }),
    );
    expect(result.content[0].text).toContain('Stealth private key derived successfully.');
    expect(result.content[0].text).toContain('Stealth address: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`');
  });
});
