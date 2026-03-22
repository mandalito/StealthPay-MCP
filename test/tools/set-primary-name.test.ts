import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndGetTool } from './mcp-tool-test-utils.js';

const {
  createPublicClientMock,
  createWalletClientMock,
  httpMock,
  privateKeyToAccountMock,
  waitForTransactionReceiptMock,
  writeContractMock,
} = vi.hoisted(() => ({
  createPublicClientMock: vi.fn(),
  createWalletClientMock: vi.fn(),
  httpMock: vi.fn(),
  privateKeyToAccountMock: vi.fn(),
  waitForTransactionReceiptMock: vi.fn(),
  writeContractMock: vi.fn(),
}));

vi.mock('viem', () => ({
  createPublicClient: createPublicClientMock,
  createWalletClient: createWalletClientMock,
  http: httpMock,
}));

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: privateKeyToAccountMock,
}));

import { registerSetPrimaryName } from '../../src/tools/set-primary-name.js';

describe('tool:set-primary-name', () => {
  const originalSenderKey = process.env.SENDER_PRIVATE_KEY;
  const originalRpcUrl = process.env.RPC_URL;

  beforeEach(() => {
    process.env.SENDER_PRIVATE_KEY = originalSenderKey;
    process.env.RPC_URL = originalRpcUrl;

    waitForTransactionReceiptMock.mockReset();
    waitForTransactionReceiptMock.mockResolvedValue({ status: 'success' });

    writeContractMock.mockReset();
    writeContractMock.mockResolvedValue('0x' + 'a'.repeat(64));

    createPublicClientMock.mockReset();
    createPublicClientMock.mockReturnValue({
      waitForTransactionReceipt: waitForTransactionReceiptMock,
    });

    createWalletClientMock.mockReset();
    createWalletClientMock.mockReturnValue({
      writeContract: writeContractMock,
    });

    httpMock.mockReset();
    httpMock.mockReturnValue('mock-transport');

    privateKeyToAccountMock.mockReset();
    privateKeyToAccountMock.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111',
    });
  });

  it('fails when SENDER_PRIVATE_KEY is missing', async () => {
    delete process.env.SENDER_PRIVATE_KEY;

    const { handler } = registerAndGetTool(registerSetPrimaryName, 'set-primary-name');
    const result = await handler({ name: 'alice.eth', chain: 'sepolia' });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('SENDER_PRIVATE_KEY not set');
    expect(writeContractMock).not.toHaveBeenCalled();
  });

  it('writes the reverse record and returns a success summary', async () => {
    process.env.SENDER_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.RPC_URL = 'https://rpc.example';

    const { handler } = registerAndGetTool(registerSetPrimaryName, 'set-primary-name');
    const result = await handler({ name: 'alice.eth', chain: 'sepolia' });

    expect(httpMock).toHaveBeenCalledWith('https://rpc.example');
    expect(privateKeyToAccountMock).toHaveBeenCalledWith('0x' + '1'.repeat(64));
    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'setName',
        args: ['alice.eth'],
      }),
    );
    expect(waitForTransactionReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: '0x' + 'a'.repeat(64),
      }),
    );
    expect(result.content[0].text).toContain('Primary name set to **alice.eth**');
    expect(result.content[0].text).toContain('0x1111111111111111111111111111111111111111');
  });
});
