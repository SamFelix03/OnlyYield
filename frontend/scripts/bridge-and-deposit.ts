#!/usr/bin/env tsx
/**
 * LI.FI Bridge + Deposit Script
 * 
 * This script bridges USDC from a source chain to Base Mainnet and deposits it into the vault.
 * 
 * Flow:
 * 1. Donor approves LI.FI router on source chain
 * 2. Donor executes bridge (tokens arrive in donor's wallet on Base)
 * 3. After bridge completes, donor approves YieldStrategy on Base Mainnet
 * 4. Donor calls YieldStrategy.deposit() directly (no operator needed!)
 * 
 * Usage:
 *   tsx scripts/bridge-and-deposit.ts <source-chain>
 * 
 * Supported source chains:
 *   - ethereum (Chain ID: 1)
 *   - polygon (Chain ID: 137)
 *   - arbitrum (Chain ID: 42161)
 *   - optimism (Chain ID: 10)
 * 
 * Environment Variables Required:
 * - DONOR_PRIVATE_KEY: Private key of the donor wallet (must have USDC on source chain)
 * - BASE_MAINNET_RPC_URL: RPC URL for Base Mainnet (optional, defaults to public RPC)
 * - YIELD_STRATEGY_ADDRESS: Address of YieldStrategy contract on Base Mainnet
 * - USDC_ADDRESS: USDC token address on Base Mainnet
 * - AMOUNT_USDC: Amount of USDC to bridge and deposit (defaults to 0.3)
 * 
 * Example:
 *   tsx scripts/bridge-and-deposit.ts ethereum
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from scripts directory
config({ path: resolve(__dirname, ".env") });

import { findDefaultToken } from '@lifi/data-types';
import type { ContractCallsQuoteRequest, StatusResponse } from '@lifi/sdk';
import {
  ChainId,
  CoinKey,
  createConfig,
  EVM,
  getContractCallsQuote,
  getStatus,
  getTokenAllowance,
  setTokenAllowance,
} from '@lifi/sdk';
import type { Address, Chain } from 'viem';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  publicActions,
  parseUnits,
  formatUnits,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, mainnet, optimism, polygon, base } from 'viem/chains';
import { createInterface } from 'node:readline';

// Chain configuration
const CHAIN_CONFIG: Record<string, { chainId: ChainId; viemChain: Chain; name: string }> = {
  ethereum: { chainId: ChainId.ETH, viemChain: mainnet, name: 'Ethereum' },
  polygon: { chainId: ChainId.POL, viemChain: polygon, name: 'Polygon' },
  arbitrum: { chainId: ChainId.ARB, viemChain: arbitrum, name: 'Arbitrum' },
  optimism: { chainId: ChainId.OPT, viemChain: optimism, name: 'Optimism' },
};

const BASE_CHAIN_ID = 8453; // Base Mainnet
const BASE_VIEM_CHAIN = base;

// Helper to prompt for confirmation
const promptConfirm = async (msg: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${msg} (Y/n): `, (answer) => {
      const input = answer.trim().toLowerCase();
      const confirmed = input === '' || input === 'y';
      resolve(confirmed);
      rl.close();
    });
  });
};

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v.trim();
}

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

const YIELD_STRATEGY_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
]);

// Helper to check and set token allowance (exact copy from yearnDeposit example)
const checkTokenAllowance = async (
  contactCallsQuoteResponse: any,
  account: ReturnType<typeof privateKeyToAccount>,
  client: ReturnType<typeof createWalletClient>
) => {
  const AddressZero = '0x0000000000000000000000000000000000000000';

  if (contactCallsQuoteResponse.action.fromToken.address !== AddressZero) {
    const approval = await getTokenAllowance(
      contactCallsQuoteResponse.action.fromToken,
      account.address,
      contactCallsQuoteResponse.estimate.approvalAddress as Address
    );

    // set approval if needed
    if (
      approval !== undefined &&
      approval < BigInt(contactCallsQuoteResponse.action.fromAmount)
    ) {
      const txHash = await setTokenAllowance({
        walletClient: client,
        spenderAddress: contactCallsQuoteResponse.estimate.approvalAddress,
        token: contactCallsQuoteResponse.action.fromToken,
        amount: BigInt(contactCallsQuoteResponse.action.fromAmount),
      });

      if (txHash) {
        // client needs to be extended with public actions to have waitForTransactionReceipt function
        // there is currently no native type in viem for this so here we use WalletClient & PublicClient
        const transactionReceipt = await (
          client as ReturnType<typeof createWalletClient> & ReturnType<typeof createPublicClient>
        ).waitForTransactionReceipt({
          hash: txHash,
          retryCount: 20,
          retryDelay: ({ count }: { count: number; error: Error }) =>
            Math.min(~~(1 << count) * 200, 3000),
        });
        console.info(
          `>> Set Token Allowance - amount: ${contactCallsQuoteResponse.action.fromAmount} txHash: ${transactionReceipt.transactionHash}.`
        );
      }
    }
  }
};

// Transform transaction request to send transaction parameters
// Note: We omit gasPrice to let Viem automatically estimate current gas prices
// This prevents "fee cap too low" errors when LI.FI's gas estimate is outdated
const transformTxRequestToSendTxParams = (
  account: ReturnType<typeof privateKeyToAccount>,
  txRequest?: any
) => {
  if (!txRequest) {
    throw new Error(
      'transformTxRequestToSendTx: A transaction request was not provided'
    );
  }

  // Omit gasPrice - Viem will automatically estimate maxFeePerGas and maxPriorityFeePerGas
  // based on current network conditions, preventing "fee cap too low" errors
  return {
    to: txRequest.to as Address,
    account,
    data: txRequest.data as `0x${string}`,
    value: txRequest.value ? BigInt(txRequest.value) : undefined,
    gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit as string) : undefined,
    chain: null,
    // Explicitly omit gasPrice - Viem will estimate EIP-1559 fees automatically
  };
};

const run = async () => {
  try {
    // Parse command line arguments
    const sourceChainArg = process.argv[2]?.toLowerCase();
    if (!sourceChainArg || !CHAIN_CONFIG[sourceChainArg]) {
      console.error('Usage: tsx scripts/bridge-and-deposit.ts <source-chain>');
      console.error('Supported chains: ethereum, polygon, arbitrum, optimism');
      process.exit(1);
    }

    const sourceChainConfig = CHAIN_CONFIG[sourceChainArg];
    console.info(`>> Starting Bridge + Deposit: ${sourceChainConfig.name} → Base Mainnet`);

    // Load environment variables
    const donorPk = requireEnv('DONOR_PRIVATE_KEY') as Address;
    const baseRpcUrl = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
    const strategyAddress = (process.env.YIELD_STRATEGY_ADDRESS || requireEnv('YIELD_STRATEGY_ADDRESS')) as Address;
    const baseUsdcAddress = (process.env.USDC_ADDRESS || requireEnv('USDC_ADDRESS')) as Address;
    const amountUsdc = parseFloat(process.env.AMOUNT_USDC || '0.3');

    // Get source chain USDC address
    const sourceUsdc = findDefaultToken(CoinKey.USDC, sourceChainConfig.chainId);
    if (!sourceUsdc) {
      throw new Error(`USDC not found on ${sourceChainConfig.name}`);
    }

    console.info(`>> Source Chain: ${sourceChainConfig.name} (${sourceChainConfig.chainId})`);
    console.info(`>> Source USDC: ${sourceUsdc.address}`);
    console.info(`>> Destination Chain: Base Mainnet (${BASE_CHAIN_ID})`);
    console.info(`>> Destination USDC: ${baseUsdcAddress}`);
    console.info(`>> Amount: ${amountUsdc} USDC`);
    console.info(`>> Strategy: ${strategyAddress}`);

    // Initialize donor wallet
    const donorAccount = privateKeyToAccount(donorPk);

    // Source chain clients
    const sourceDonorClient = createWalletClient({
      account: donorAccount,
      chain: sourceChainConfig.viemChain,
      transport: http(),
    }).extend(publicActions);
    const sourcePublicClient = sourceDonorClient.extend(publicActions);

    // Base Mainnet clients
    const baseDonorClient = createWalletClient({
      account: donorAccount,
      chain: base,
      transport: http(baseRpcUrl),
    }).extend(publicActions);
    const basePublicClient = createPublicClient({ chain: base, transport: http(baseRpcUrl) });

    // Check donor balances on source chain
    const [usdcBalance, nativeBalance] = await Promise.all([
      sourcePublicClient.readContract({
        address: sourceUsdc.address as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [donorAccount.address],
      }),
      sourcePublicClient.getBalance({ address: donorAccount.address }),
    ]);

    const usdcDecimals = await sourcePublicClient.readContract({
      address: sourceUsdc.address as Address,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    const usdcBalanceFormatted = formatUnits(usdcBalance, usdcDecimals);
    const nativeBalanceFormatted = formatUnits(nativeBalance, 18);
    const nativeSymbol = sourceChainConfig.chainId === ChainId.ETH ? 'ETH' : 
                         sourceChainConfig.chainId === ChainId.POL ? 'MATIC' : 
                         sourceChainConfig.chainId === ChainId.ARB ? 'ETH' : 'ETH';

    console.info(`>> Donor Wallet Balance (${sourceChainConfig.name}):`);
    console.info(`   ${usdcBalanceFormatted} USDC`);
    console.info(`   ${nativeBalanceFormatted} ${nativeSymbol} (for gas)`);

    // Adjust amount if needed
    let finalAmountUsdc = amountUsdc;
    const requestedAmountBaseUnits = parseUnits(amountUsdc.toString(), usdcDecimals);
    if (usdcBalance < requestedAmountBaseUnits) {
      finalAmountUsdc = parseFloat(usdcBalanceFormatted) * 0.99;
      console.info(`>> Using ${finalAmountUsdc.toFixed(6)} USDC instead of ${amountUsdc} USDC`);
    }
    const amountInBaseUnits = parseUnits(finalAmountUsdc.toFixed(6), usdcDecimals);

    // Setup LI.FI SDK (exact pattern from yearnDeposit example)
    const client = createWalletClient({
      account: donorAccount,
      chain: sourceChainConfig.viemChain,
      transport: http(),
    }).extend(publicActions);

    const switchChains = [mainnet, arbitrum, optimism, polygon, base];

    createConfig({
      integrator: 'lifi-sdk-example',
      providers: [
        EVM({
          getWalletClient: () => Promise.resolve(client),
          switchChain: (chainId: number) =>
            Promise.resolve(
              createWalletClient({
                account: donorAccount,
                chain: switchChains.find(
                  (chain) => chain.id === chainId
                ) as Chain,
                transport: http(),
              })
            ),
        }),
      ],
    });

    // Prepare deposit function call data (exact pattern from yearnDeposit example)
    const depositTxData = encodeFunctionData({
      abi: YIELD_STRATEGY_ABI,
      functionName: 'deposit',
      args: [amountInBaseUnits, donorAccount.address],
    });

    const contractCallsQuoteRequest: ContractCallsQuoteRequest = {
      fromChain: sourceChainConfig.chainId,
      fromToken: sourceUsdc.address,
      fromAddress: donorAccount.address,
      toChain: BASE_CHAIN_ID,
      toToken: baseUsdcAddress,
      toAmount: amountInBaseUnits.toString(),
      contractCalls: [
        {
          fromAmount: amountInBaseUnits.toString(),
          fromTokenAddress: baseUsdcAddress,
          toContractAddress: strategyAddress,
          toContractCallData: depositTxData,
          toContractGasLimit: '500000', // Gas limit for deposit call
        },
      ],
    };
    console.info(
      '>> create contract calls quote request',
      contractCallsQuoteRequest
    );

    const contactCallsQuoteResponse = await getContractCallsQuote(
      contractCallsQuoteRequest
    );
    console.info('>> Contract Calls Quote', contactCallsQuoteResponse);

    if (!(await promptConfirm('Execute Quote?'))) {
      return;
    }

    await checkTokenAllowance(contactCallsQuoteResponse, donorAccount, client);

    console.info(
      '>> Execute transaction',
      contactCallsQuoteResponse.transactionRequest
    );

    const hash = await client.sendTransaction(
      transformTxRequestToSendTxParams(
        donorAccount,
        contactCallsQuoteResponse.transactionRequest
      )
    );
    console.info('>> Transaction sent', hash);

    const receipt = await client.waitForTransactionReceipt({
      hash,
    });
    console.info('>> Transaction receipt', receipt);

    // wait for execution (exact pattern from yearnDeposit example)
    if (sourceChainConfig.chainId !== BASE_CHAIN_ID) {
      let result: StatusResponse;
      do {
        await new Promise((res) => {
          setTimeout(() => {
            res(null);
          }, 5000);
        });

        result = await getStatus({
          txHash: receipt.transactionHash,
          bridge: contactCallsQuoteResponse.tool,
          fromChain: contactCallsQuoteResponse.action.fromChainId,
          toChain: contactCallsQuoteResponse.action.toChainId,
        });

        console.info('>> Status update', result);
      } while (result.status !== 'DONE' && result.status !== 'FAILED');
    }

    console.info('>> DONE');
  } catch (e) {
    console.error('>> Error:', e);
    process.exit(1);
  }
};

run();
