import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  SUPPORTED_CHAINS, ENS_CONTRACTS, ENS_REVERSE_REGISTRAR_ABI, explorerTxUrl,
} from '../config.js';

/**
 * Register the set-primary-name tool on the MCP server.
 *
 * Sets the ENS reverse record so the user's wallet address resolves to their ENS name.
 * This is required for apps to display the ENS name when looking up a wallet address.
 */
export function registerSetPrimaryName(server: McpServer) {
  server.tool(
    'set-primary-name',
    'Set the primary ENS name (reverse record) for your wallet. After this, your address resolves to the given ENS name.',
    {
      name: z.string().describe('ENS name to set as primary (e.g. "myname.eth")'),
      chain: z.string().optional().describe('Chain (default: sepolia)'),
    },
    async ({ name, chain }) => {
      const privateKey = process.env.SENDER_PRIVATE_KEY as `0x${string}` | undefined;
      if (!privateKey) {
        return { content: [{ type: 'text' as const, text: 'SENDER_PRIVATE_KEY not set. Add it to .env first.' }] };
      }

      const chainName = chain ?? 'sepolia';
      const chainConfig = SUPPORTED_CHAINS[chainName];
      const contracts = ENS_CONTRACTS[chainName];
      if (!chainConfig || !contracts?.reverseRegistrar) {
        return { content: [{ type: 'text' as const, text: `Reverse registrar not configured for ${chainName}. Supported: ${Object.keys(ENS_CONTRACTS).filter(c => ENS_CONTRACTS[c].reverseRegistrar).join(', ')}` }] };
      }

      const account = privateKeyToAccount(privateKey);
      const rpcUrl = process.env.RPC_URL;
      const publicClient = createPublicClient({ chain: chainConfig, transport: http(rpcUrl) });
      const walletClient = createWalletClient({ account, chain: chainConfig, transport: http(rpcUrl) });

      const txHash = await walletClient.writeContract({
        address: contracts.reverseRegistrar,
        abi: ENS_REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120_000,
        pollingInterval: 3_000,
      });

      return {
        content: [{
          type: 'text' as const,
          text: `✅ Primary name set to **${name}**\n\nYour wallet address ${account.address} now resolves to ${name}.\n\nTransaction: ${explorerTxUrl(chainName, txHash)}`,
        }],
      };
    },
  );
}
