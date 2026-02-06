import { NextResponse } from "next/server";
import { findDefaultToken } from '@lifi/data-types';
import type { ContractCallsQuoteRequest } from '@lifi/sdk';
import {
  ChainId,
  CoinKey,
  createConfig,
  EVM,
  getContractCallsQuote,
  getTokenAllowance,
  setTokenAllowance,
  getStatus,
} from '@lifi/sdk';
import { createWalletClient, createPublicClient, http, parseAbi, publicActions, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, mainnet, optimism, polygon, base } from "viem/chains";
import { getSupabase } from "@/lib/supabase/server";
import type { Address, Chain } from 'viem';

const BASE_CHAIN_ID = 8453; // Base Mainnet

const CHAIN_CONFIG: Record<string, { chainId: ChainId; viemChain: Chain; name: string }> = {
  ethereum: { chainId: ChainId.ETH, viemChain: mainnet, name: 'Ethereum' },
  polygon: { chainId: ChainId.POL, viemChain: polygon, name: 'Polygon' },
  arbitrum: { chainId: ChainId.ARB, viemChain: arbitrum, name: 'Arbitrum' },
  optimism: { chainId: ChainId.OPT, viemChain: optimism, name: 'Optimism' },
  base: { chainId: ChainId.BAS, viemChain: base, name: 'Base' },
};

const YIELD_STRATEGY_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v.trim();
}

// Helper to check and set token allowance
async function checkTokenAllowance(
  contactCallsQuoteResponse: any,
  account: ReturnType<typeof privateKeyToAccount>,
  client: ReturnType<typeof createWalletClient>
) {
  const AddressZero = '0x0000000000000000000000000000000000000000';

  if (contactCallsQuoteResponse.action.fromToken.address !== AddressZero) {
    const approval = await getTokenAllowance(
      contactCallsQuoteResponse.action.fromToken,
      account.address,
      contactCallsQuoteResponse.estimate.approvalAddress as Address
    );

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
        const publicClient = client.extend(publicActions);
        await publicClient.waitForTransactionReceipt({
          hash: txHash,
          retryCount: 20,
          retryDelay: ({ count }: { count: number; error: Error }) =>
            Math.min(~~(1 << count) * 200, 3000),
        });
      }
    }
  }
}

// Transform transaction request to send transaction parameters
function transformTxRequestToSendTxParams(
  account: ReturnType<typeof privateKeyToAccount>,
  txRequest?: any
) {
  if (!txRequest) {
    throw new Error('transformTxRequestToSendTx: A transaction request was not provided');
  }

  // Omit gasPrice - Viem will automatically estimate maxFeePerGas and maxPriorityFeePerGas
  return {
    to: txRequest.to as Address,
    account,
    data: txRequest.data as `0x${string}`,
    value: txRequest.value ? BigInt(txRequest.value) : undefined,
    gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit as string) : undefined,
    chain: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      donor_wallet_address: `0x${string}`;
      source_chain: string; // 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'
      amount_in_base_units: string;
      amount_in: string;
      recipient_wallet_addresses: string[];
    };

    if (!body.donor_wallet_address || !body.source_chain || !body.amount_in_base_units) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sourceChainConfig = CHAIN_CONFIG[body.source_chain.toLowerCase()];
    if (!sourceChainConfig) {
      return NextResponse.json({ error: "Invalid source chain" }, { status: 400 });
    }

    // Load environment variables
    const baseRpcUrl = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
    const strategyAddress = (process.env.YIELD_STRATEGY_ADDRESS || requireEnv('YIELD_STRATEGY_ADDRESS')) as Address;
    const baseUsdcAddress = (process.env.USDC_ADDRESS || requireEnv('USDC_ADDRESS')) as Address;

    // Get source chain USDC address
    const sourceUsdc = findDefaultToken(CoinKey.USDC, sourceChainConfig.chainId);
    if (!sourceUsdc) {
      return NextResponse.json({ error: `USDC not found on ${sourceChainConfig.name}` }, { status: 400 });
    }

    // For server-side, we need the donor's private key or we need to return the quote
    // Since we can't access the donor's private key on the server, we'll return the quote
    // and let the client execute the transaction
    
    // Setup LI.FI SDK
    const switchChains = [mainnet, arbitrum, optimism, polygon, base];
    // Note: We'll create a dummy client for config, actual execution happens on client
    const dummyAccount = privateKeyToAccount('0x0000000000000000000000000000000000000000000000000000000000000001' as Address);
    const dummyClient = createWalletClient({
      account: dummyAccount,
      chain: sourceChainConfig.viemChain,
      transport: http(),
    }).extend(publicActions);

    createConfig({
      integrator: 'creator-support',
      providers: [
        EVM({
          getWalletClient: () => Promise.resolve(dummyClient),
          switchChain: (chainId: number) =>
            Promise.resolve(
              createWalletClient({
                account: dummyAccount,
                chain: switchChains.find(
                  (chain) => chain.id === chainId
                ) as Chain,
                transport: http(),
              })
            ),
        }),
      ],
    });

    // Prepare deposit function call data
    const depositTxData = encodeFunctionData({
      abi: YIELD_STRATEGY_ABI,
      functionName: 'deposit',
      args: [BigInt(body.amount_in_base_units), body.donor_wallet_address],
    });

    const contractCallsQuoteRequest: ContractCallsQuoteRequest = {
      fromChain: sourceChainConfig.chainId,
      fromToken: sourceUsdc.address,
      fromAddress: body.donor_wallet_address,
      toChain: BASE_CHAIN_ID,
      toToken: baseUsdcAddress,
      toAmount: body.amount_in_base_units,
      contractCalls: [
        {
          fromAmount: body.amount_in_base_units,
          fromTokenAddress: baseUsdcAddress,
          toContractAddress: strategyAddress,
          toContractCallData: depositTxData,
          toContractGasLimit: '500000',
        },
      ],
    };

    const contactCallsQuoteResponse = await getContractCallsQuote(contractCallsQuoteRequest);

    // Note: lifiExplorerLink will be available after transaction execution via getStatus()
    // The client should call getStatus() with the transaction hash to get the explorer link
    const response = {
      ok: true,
      quote: contactCallsQuoteResponse,
      source_chain: sourceChainConfig.name,
      source_chain_id: sourceChainConfig.chainId,
      source_usdc_address: sourceUsdc.address,
      destination_chain_id: BASE_CHAIN_ID,
      destination_usdc_address: baseUsdcAddress,
      strategy_address: strategyAddress,
      // Note: To get lifiExplorerLink, call getStatus() after transaction execution:
      // const status = await getStatus({ txHash, bridge: quote.tool, fromChain, toChain });
      // const explorerLink = status.lifiExplorerLink;
    };

    return NextResponse.json(response);
  } catch (e: any) {
    console.error('Bridge deposit API error:', e);
    return NextResponse.json({ error: e.message || 'Bridge deposit failed' }, { status: 500 });
  }
}
