import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const { scanAnnouncementsMock } = vi.hoisted(() => ({
  scanAnnouncementsMock: vi.fn(),
}));

vi.mock('../../src/lib/scanner.js', () => ({
  scanAnnouncements: scanAnnouncementsMock,
}));

import { registerScanAnnouncements } from '../../src/tools/scan-announcements.js';

describe('tool:scan-announcements', () => {
  const originalViewing = process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
  const originalSpendingPub = process.env.RECIPIENT_SPENDING_PUBLIC_KEY;

  beforeEach(() => {
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = originalViewing;
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = originalSpendingPub;
    scanAnnouncementsMock.mockReset();
  });

  it('fails when required keys are missing', async () => {
    delete process.env.RECIPIENT_VIEWING_PRIVATE_KEY;
    delete process.env.RECIPIENT_SPENDING_PUBLIC_KEY;

    const { handler } = registerAndGetTool(registerScanAnnouncements, 'scan-announcements');
    const result = await handler({ chain: 'sepolia' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing keys');
  });

  it('parses block ranges and returns discovered payments', async () => {
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = 'aa'.repeat(32); // no 0x
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = '02' + 'bb'.repeat(32); // no 0x

    scanAnnouncementsMock.mockResolvedValue([
      {
        stealthAddress: '0x4444444444444444444444444444444444444444',
        token: '0x5555555555555555555555555555555555555555',
        amount: 1000000000000000000n,
        blockNumber: 123n,
        txHash: '0xscan',
        ephemeralPublicKey: '0x02cc',
      },
    ]);

    const { handler } = registerAndGetTool(registerScanAnnouncements, 'scan-announcements');
    const result = await handler({ chain: 'sepolia', fromBlock: '100', toBlock: '200' });

    expect(result.isError).toBeUndefined();
    expect(scanAnnouncementsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        viewingPrivateKey: '0x' + 'aa'.repeat(32),
        spendingPublicKey: '0x' + '02' + 'bb'.repeat(32),
        fromBlock: 100n,
        toBlock: 200n,
      }),
    );
    expect(result.content[0].text).toContain('Found **1** stealth payment(s) on sepolia');
    expect(result.content[0].text).toContain('Tx: https://');
    expect(result.content[0].text).toContain('0xscan');
  });

  it('uses env keys even if caller tries to pass key-like fields', async () => {
    process.env.RECIPIENT_VIEWING_PRIVATE_KEY = '11'.repeat(32);
    process.env.RECIPIENT_SPENDING_PUBLIC_KEY = '02' + '22'.repeat(32);

    scanAnnouncementsMock.mockResolvedValue([]);

    const { handler } = registerAndGetTool(registerScanAnnouncements, 'scan-announcements');
    const result = await handler({
      chain: 'sepolia',
      // Extra fields are ignored by the tool contract. This asserts no user-provided key override path.
      viewingPrivateKey: '0x' + 'aa'.repeat(32),
      spendingPublicKey: '0x' + '02' + 'bb'.repeat(32),
    } as any);

    expect(result.isError).toBeUndefined();
    expect(scanAnnouncementsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        viewingPrivateKey: '0x' + '11'.repeat(32),
        spendingPublicKey: '0x' + '02' + '22'.repeat(32),
      }),
    );
  });
});
