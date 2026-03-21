import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { getStealthMetaAddressMock, generateStealthAddressMock } = vi.hoisted(() => ({
  getStealthMetaAddressMock: vi.fn(),
  generateStealthAddressMock: vi.fn(),
}));

vi.mock('../../src/lib/ens.js', () => ({
  getStealthMetaAddress: getStealthMetaAddressMock,
}));

vi.mock('../../src/lib/stealth.js', () => ({
  generateStealthAddress: generateStealthAddressMock,
}));

import { registerGenerateStealthAddress } from '../../src/tools/generate-stealth-address.js';

describe('tool:generate-stealth-address', () => {
  beforeEach(() => {
    getStealthMetaAddressMock.mockReset();
    generateStealthAddressMock.mockReset();
  });

  it('returns error when recipient has no stealth meta-address', async () => {
    getStealthMetaAddressMock.mockResolvedValue(null);
    const { handler } = registerAndGetTool(registerGenerateStealthAddress, 'generate-stealth-address');

    const result = await handler({ name: 'alice.eth' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No stealth meta-address found for "alice.eth"');
  });

  it('returns generated stealth address details', async () => {
    getStealthMetaAddressMock.mockResolvedValue('st:eth:0xabc');
    generateStealthAddressMock.mockReturnValue({
      stealthAddress: '0x1111111111111111111111111111111111111111',
      ephemeralPublicKey: '0x02aa',
      viewTag: '0x11',
    });

    const { handler } = registerAndGetTool(registerGenerateStealthAddress, 'generate-stealth-address');
    const result = await handler({ name: 'alice.eth' });

    expect(result.isError).toBeUndefined();
    expect(getStealthMetaAddressMock).toHaveBeenCalledWith('alice.eth');
    expect(generateStealthAddressMock).toHaveBeenCalledWith('st:eth:0xabc');
    expect(result.content[0].text).toContain('Stealth address: `0x1111111111111111111111111111111111111111`');
    expect(result.content[0].text).toContain('Ephemeral public key: `0x02aa`');
  });
});
