import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { registerEnsNameMock } = vi.hoisted(() => ({
  registerEnsNameMock: vi.fn(),
}));

vi.mock('../../src/lib/ens-register.js', () => ({
  registerEnsName: registerEnsNameMock,
}));

import { registerRegisterEnsName } from '../../src/tools/register-ens-name.js';

describe('tool:register-ens-name', () => {
  const originalSenderKey = process.env.SENDER_PRIVATE_KEY;

  beforeEach(() => {
    process.env.SENDER_PRIVATE_KEY = originalSenderKey;
    registerEnsNameMock.mockReset();
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerRegisterEnsName, 'register-ens-name');
    const result = await handler({ label: 'alice', chain: 'sepolia', years: 1 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY environment variable is not set');
  });

  it('calls register flow and returns success summary', async () => {
    process.env.SENDER_PRIVATE_KEY = '1'.repeat(64); // no 0x
    registerEnsNameMock.mockResolvedValue({
      name: 'alice.eth',
      owner: '0x9999999999999999999999999999999999999999',
      commitTxHash: '0xcommit',
      registerTxHash: '0xregister',
      cost: '0.01 ETH',
      expiresIn: '1 year',
    });

    const { handler } = registerAndGetTool(registerRegisterEnsName, 'register-ens-name');
    const result = await handler({ label: 'alice', chain: 'sepolia', years: 2 });

    expect(result.isError).toBeUndefined();
    expect(registerEnsNameMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'alice',
        chain: 'sepolia',
        privateKey: '0x' + '1'.repeat(64),
        duration: 63_072_000n,
      }),
      expect.any(Function),
    );
    expect(result.content[0].text).toContain('**alice.eth** registered successfully!');
    expect(result.content[0].text).toContain('Commit tx: https://');
    expect(result.content[0].text).toContain('0xcommit');
  });
});
