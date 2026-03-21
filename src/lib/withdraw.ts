/**
 * Withdraw funds from a stealth address.
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN, ERC20_ABI } from '../config.js';

export interface WithdrawParams {
  stealthPrivateKey: `0x${string}`;
  to: `0x${string}`;
  token: `0x${string}` | 'ETH';
  amount?: string;
  chain?: string;
}

export interface WithdrawResult {
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  token: string;
}

export async function withdrawFromStealth(params: WithdrawParams): Promise<WithdrawResult> {
  const chainName = params.chain ?? DEFAULT_CHAIN;
  const chain = SUPPORTED_CHAINS[chainName];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`);
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(params.stealthPrivateKey)) {
    throw new Error('Invalid stealth private key format.');
  }

  const account = privateKeyToAccount(params.stealthPrivateKey);
  const stealthAddress = account.address;

  const rpcUrl = process.env.RPC_URL;
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // Check ETH balance for gas
  const ethBalance = await publicClient.getBalance({ address: stealthAddress });
  if (ethBalance === 0n) {
    throw new Error(
      `Stealth address ${stealthAddress} has no ETH for gas. ` +
      `Send a small amount of ETH to it first. ` +
      `(Future improvement: ERC-4337 paymaster for gasless withdrawals.)`
    );
  }

  if (params.token === 'ETH') {
    // Native ETH withdrawal
    const gasEstimate = await publicClient.estimateGas({
      account: stealthAddress,
      to: params.to,
      value: ethBalance,
    });

    const gasPrice = await publicClient.getGasPrice();
    const gasCost = gasEstimate * gasPrice;

    let value: bigint;
    if (params.amount) {
      value = BigInt(Math.floor(parseFloat(params.amount) * 1e18));
      if (value + gasCost > ethBalance) {
        throw new Error(
          `Insufficient ETH. Balance: ${formatEther(ethBalance)}, ` +
          `requested: ${params.amount}, estimated gas: ${formatEther(gasCost)}`
        );
      }
    } else {
      // Withdraw max (balance minus gas)
      value = ethBalance - gasCost * 120n / 100n; // 20% gas buffer
      if (value <= 0n) {
        throw new Error(
          `ETH balance (${formatEther(ethBalance)}) is too low to cover gas (${formatEther(gasCost)})`
        );
      }
    }

    const txHash = await walletClient.sendTransaction({
      to: params.to,
      value,
    });

    return {
      txHash,
      from: stealthAddress,
      to: params.to,
      amount: formatEther(value),
      token: 'ETH',
    };
  } else {
    // ERC-20 withdrawal
    const tokenAddress = params.token as `0x${string}`;

    const [decimals, balance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [stealthAddress],
      }),
    ]);

    const tokenBalance = balance as bigint;
    if (tokenBalance === 0n) {
      throw new Error(`Stealth address has no balance for token ${tokenAddress}`);
    }

    let amountToSend: bigint;
    if (params.amount) {
      amountToSend = parseUnits(params.amount, decimals as number);
      if (amountToSend > tokenBalance) {
        throw new Error(
          `Insufficient token balance. Have: ${formatUnits(tokenBalance, decimals as number)}, ` +
          `requested: ${params.amount}`
        );
      }
    } else {
      amountToSend = tokenBalance;
    }

    const txHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [params.to, amountToSend],
    });

    return {
      txHash,
      from: stealthAddress,
      to: params.to,
      amount: formatUnits(amountToSend, decimals as number),
      token: tokenAddress,
    };
  }
}
