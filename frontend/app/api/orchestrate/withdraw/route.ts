import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { findDefaultToken } from '@lifi/data-types';
import {
  ChainId,
  CoinKey,
} from '@lifi/sdk';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  publicActions,
  decodeErrorResult,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, mainnet, optimism, polygon, base } from 'viem/chains';
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Address, Chain } from 'viem';

// Base Mainnet chain ID (where the vault is deployed)
const BASE_MAINNET_CHAIN_ID = 8453;

// Map numeric chain IDs to chain configs
const CHAIN_ID_TO_CONFIG: Record<number, { chainId: ChainId; viemChain: Chain; name: string }> = {
  1: { chainId: ChainId.ETH, viemChain: mainnet, name: 'Ethereum' },
  137: { chainId: ChainId.POL, viemChain: polygon, name: 'Polygon' },
  42161: { chainId: ChainId.ARB, viemChain: arbitrum, name: 'Arbitrum' },
  10: { chainId: ChainId.OPT, viemChain: optimism, name: 'Optimism' },
  8453: { chainId: ChainId.BAS, viemChain: base, name: 'Base' },
};

// Load full ABIs from JSON files (for writeContract and error decoding)
const YIELD_ORCHESTRATOR_ABI = JSON.parse(
  readFileSync(resolve(process.cwd(), "abis/yield-orchestrator.json"), "utf-8")
);

const YIELD_STRATEGY_ABI = JSON.parse(
  readFileSync(resolve(process.cwd(), "abis/yield-strategy.json"), "utf-8")
);

// Parse ABI for readContract calls (needs proper typing)
const YIELD_STRATEGY_READ_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function previewWithdraw(uint256 assets) view returns (uint256 shares)',
]);

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v.trim();
}

function getBaseMainnetRpcUrl() {
  return (
    process.env.BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ||
    'https://mainnet.base.org'
  ).trim();
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = (await req.json()) as {
      donation_id: string;
      donor_wallet_address: `0x${string}`;
      // Optional: if not provided, will withdraw full amount
      amount_in_base_units?: string;
    };

    if (!body.donation_id || !body.donor_wallet_address) {
      return NextResponse.json({ error: "donation_id and donor_wallet_address required" }, { status: 400 });
    }

    // Get donation record to find chain_id
    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .select("*")
      .eq("id", body.donation_id)
      .single();

    if (donationError || !donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    if (donation.withdrawn) {
      return NextResponse.json({ error: "Donation already withdrawn" }, { status: 400 });
    }

    // Verify the donor wallet matches the donation
    if (donation.donor_wallet_address.toLowerCase() !== body.donor_wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Donor wallet address does not match donation" }, { status: 403 });
    }

    const originalChainId = donation.chain_id as number;
    const donorAddress = body.donor_wallet_address as Address;

    // Get chain config for original chain
    const targetChainConfig = CHAIN_ID_TO_CONFIG[originalChainId];
    if (!targetChainConfig) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${originalChainId}` },
        { status: 400 }
      );
    }

    // Load environment variables
    const baseMainnetRpcUrl = getBaseMainnetRpcUrl();
    const strategyAddress = (process.env.YIELD_STRATEGY_ADDRESS || requireEnv('YIELD_STRATEGY_ADDRESS')) as Address;
    const baseMainnetUsdcAddress = (process.env.USDC_ADDRESS || requireEnv('USDC_ADDRESS')) as Address;

    // Create public client to read strategy state
    const baseMainnetPublicClient = createPublicClient({
      chain: base,
      transport: http(baseMainnetRpcUrl),
    });

    // Get donor's strategy share balance
    const donorShares = await baseMainnetPublicClient.readContract({
      address: strategyAddress,
      abi: YIELD_STRATEGY_READ_ABI,
      functionName: 'balanceOf',
      args: [donorAddress],
    }) as bigint;

    if (donorShares === BigInt(0)) {
      return NextResponse.json({ error: "No shares to withdraw" }, { status: 400 });
    }

    // Helper function to retry RPC calls with exponential backoff
    const retryRpcCall = async <T>(
      fn: () => Promise<T>,
      maxRetries = 3,
      baseDelay = 1000
    ): Promise<T> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error: any) {
          const isRateLimit = error?.cause?.cause?.details?.includes('rate limit') || 
                             error?.cause?.details?.includes('rate limit') ||
                             error?.message?.includes('rate limit') ||
                             error?.status === 429;
          
          if (isRateLimit && i < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, i);
            console.warn(`Rate limit hit, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Get current strategy state to calculate max withdrawable
    // Add small delay between calls to avoid rate limiting
    const totalAssets = await retryRpcCall(() =>
      baseMainnetPublicClient.readContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_READ_ABI,
        functionName: 'totalAssets',
      })
    ) as bigint;
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between calls
    
    const totalSupply = await retryRpcCall(() =>
      baseMainnetPublicClient.readContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_READ_ABI,
        functionName: 'totalSupply',
      })
    ) as bigint;
    
    // Calculate maximum withdrawable assets (rough estimate)
    const estimatedMaxAssets = totalSupply > BigInt(0) 
      ? (donorShares * totalAssets) / totalSupply 
      : donorShares;
    
    // Determine withdrawal amount
    let withdrawAmountAssets: bigint;
    if (body.amount_in_base_units) {
      const requestedAmount = BigInt(body.amount_in_base_units);
      withdrawAmountAssets = requestedAmount;
    } else {
      // No amount specified, use estimated max
      withdrawAmountAssets = estimatedMaxAssets;
    }
    
    // Add delay before next call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use previewWithdraw to get exact shares needed - this is what the contract will use
    // This ensures we're using the contract's exact calculation logic
    const requiredShares = await retryRpcCall(() =>
      baseMainnetPublicClient.readContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_READ_ABI,
        functionName: 'previewWithdraw',
        args: [withdrawAmountAssets],
      })
    ) as bigint;
    
    // Check if we have enough shares
    if (requiredShares > donorShares) {
      // Calculate the actual maximum we can withdraw by finding assets where previewWithdraw <= donorShares
      // Use binary search approach: start with estimated max and reduce until it fits
      let low = BigInt(0);
      let high = estimatedMaxAssets;
      let bestAmount = BigInt(0);
      
      // Binary search for maximum withdrawable amount
      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / BigInt(2);
        if (mid === BigInt(0)) break;
        
        try {
          // Add delay between binary search iterations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const testShares = await retryRpcCall(() =>
            baseMainnetPublicClient.readContract({
              address: strategyAddress,
              abi: YIELD_STRATEGY_READ_ABI,
              functionName: 'previewWithdraw',
              args: [mid],
            })
          ) as bigint;
          
          if (testShares <= donorShares) {
            bestAmount = mid;
            low = mid + BigInt(1);
          } else {
            high = mid - BigInt(1);
          }
        } catch (e) {
          // If previewWithdraw fails, reduce high
          high = mid - BigInt(1);
        }
      }
      
      if (bestAmount === BigInt(0)) {
        return NextResponse.json({ 
          error: `Cannot withdraw ${formatUnits(withdrawAmountAssets, 6)} USDC. Maximum available: ${formatUnits(estimatedMaxAssets, 6)} USDC (estimated). Please try withdrawing a smaller amount.`,
          max_available_estimate: estimatedMaxAssets.toString(),
        }, { status: 400 });
      }
      
      // If user specified an amount that's too high, use the calculated max
      if (body.amount_in_base_units) {
        console.info(`>> Requested amount (${formatUnits(withdrawAmountAssets, 6)} USDC) requires more shares than available. Using maximum withdrawable: ${formatUnits(bestAmount, 6)} USDC`);
        withdrawAmountAssets = bestAmount;
      } else {
        withdrawAmountAssets = bestAmount;
      }
    }
    
    // Final check - ensure we have something to withdraw
    if (withdrawAmountAssets === BigInt(0)) {
      return NextResponse.json({ 
        error: "No assets available to withdraw" 
      }, { status: 400 });
    }

    console.info(`>> Creating withdrawal: ${formatUnits(withdrawAmountAssets, 6)} USDC`);
    console.info(`>> Donor: ${donorAddress}`);
    console.info(`>> Donor shares: ${donorShares.toString()}`);
    console.info(`>> Strategy total assets: ${formatUnits(totalAssets, 6)} USDC`);
    console.info(`>> Strategy total supply: ${totalSupply.toString()} shares`);
    console.info(`>> Estimated max withdrawable: ${formatUnits(estimatedMaxAssets, 6)} USDC`);
    console.info(`>> Target chain: ${targetChainConfig.name} (${originalChainId})`);

    // Load orchestrator address and operator private key
    const orchestratorAddress = (process.env.YIELD_ORCHESTRATOR_ADDRESS || requireEnv('YIELD_ORCHESTRATOR_ADDRESS')) as Address;
    const operatorPk = requireEnv('OPERATOR_PRIVATE_KEY') as Address;
    const operator = privateKeyToAccount(operatorPk);

    // Check if donor has approved orchestrator to spend their strategy shares
    // The orchestrator needs approval to call strategy.withdraw() on behalf of the donor
    console.info(`>> Checking allowance for orchestrator...`);
    
    // Add delay before next call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Calculate required shares for the withdrawal amount (using previewWithdraw for accuracy)
    const requiredSharesForWithdrawal = await retryRpcCall(() =>
      baseMainnetPublicClient.readContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_READ_ABI,
        functionName: 'previewWithdraw',
        args: [withdrawAmountAssets],
      })
    ) as bigint;
    
    // Add delay before next call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const allowance = await retryRpcCall(() =>
      baseMainnetPublicClient.readContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_READ_ABI,
        functionName: 'allowance',
        args: [donorAddress, orchestratorAddress],
      })
    ) as bigint;

    console.info(`>> Required shares: ${requiredSharesForWithdrawal.toString()}, Current allowance: ${allowance.toString()}`);

    if (allowance < requiredSharesForWithdrawal) {
      return NextResponse.json({
        error: "Insufficient approval",
        message: `Donor must approve orchestrator to spend strategy shares. Current allowance: ${formatUnits(allowance, 18)}, Required: ${formatUnits(requiredSharesForWithdrawal, 18)}`,
        needs_approval: true,
        strategy_address: strategyAddress,
        orchestrator_address: orchestratorAddress,
        required_shares: requiredSharesForWithdrawal.toString(),
        current_allowance: allowance.toString(),
      }, { status: 400 });
    }

    // Create wallet client for operator
    const walletClient = createWalletClient({
      account: operator,
      chain: base,
      transport: http(baseMainnetRpcUrl),
    }).extend(publicActions);

    // Execute withdrawERC20 using operator wallet
    // This withdraws to the donor's account on Base
    console.info(`>> Executing withdrawERC20 via orchestrator...`);
    const withdrawHash = await walletClient.writeContract({
      address: orchestratorAddress,
      abi: YIELD_ORCHESTRATOR_ABI,
      functionName: 'withdrawERC20',
      args: [
        donorAddress, // owner
        baseMainnetUsdcAddress, // strategyAsset
        withdrawAmountAssets, // assets
        baseMainnetUsdcAddress, // outputAsset (same as strategyAsset)
        BigInt(0), // minAmountOut (0 for same asset)
        donorAddress, // receiver (donor's account)
      ],
    });

    console.info(`>> Withdrawal transaction submitted: ${withdrawHash}`);
    
    // Wait for transaction confirmation
    const receipt = await baseMainnetPublicClient.waitForTransactionReceipt({ hash: withdrawHash });
    console.info(`>> Withdrawal confirmed in block ${receipt.blockNumber}`);

    // If same chain (Base Mainnet to Base Mainnet), we're done
    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      return NextResponse.json({
        ok: true,
        same_chain: true,
        withdraw_tx_hash: withdrawHash,
        amount_in_base_units: withdrawAmountAssets.toString(),
        message: "Same chain withdrawal completed - funds are in donor's account",
      });
    }

    // For cross-chain withdrawals, return bridge info for client to execute
    const targetUsdc = findDefaultToken(CoinKey.USDC, targetChainConfig.chainId);
    if (!targetUsdc) {
      return NextResponse.json(
        { error: `USDC not found on ${targetChainConfig.name}` },
        { status: 400 }
      );
    }

    // Return bridge info for client to execute
    return NextResponse.json({
      ok: true,
      same_chain: false,
      withdraw_tx_hash: withdrawHash,
      withdraw_completed: true,
      amount_in_base_units: withdrawAmountAssets.toString(),
      source_chain: 'Base',
      source_chain_id: BASE_MAINNET_CHAIN_ID,
      source_usdc_address: baseMainnetUsdcAddress,
      destination_chain: targetChainConfig.name,
      destination_chain_id: targetChainConfig.chainId,
      destination_usdc_address: targetUsdc.address,
      message: "Withdrawal completed - bridge funds from Base to original chain",
    });
  } catch (error: any) {
    // Try to decode the error for better error messages
    let errorMessage = error?.shortMessage || error?.message || String(error);
    
    if (error?.data || error?.raw) {
      const errorData = (error.data || error.raw) as `0x${string}`;
      try {
        // Try decoding with strategy ABI first (most errors come from strategy/vault)
        const decoded = decodeErrorResult({
          abi: YIELD_STRATEGY_ABI,
          data: errorData,
        });
        errorMessage = `${decoded.errorName}: ${JSON.stringify(decoded.args)}`;
        console.error('Decoded error (strategy ABI):', decoded);
      } catch {
        try {
          // Try decoding with orchestrator ABI
          const decoded = decodeErrorResult({
            abi: YIELD_ORCHESTRATOR_ABI,
            data: errorData,
          });
          errorMessage = `${decoded.errorName}: ${JSON.stringify(decoded.args)}`;
          console.error('Decoded error (orchestrator ABI):', decoded);
        } catch {
          // If both fail, log the raw error data for debugging
          console.error('Could not decode error. Raw error data:', errorData);
          console.error('Error signature:', errorData.slice(0, 10));
        }
      }
    }
    
    console.error('Orchestrate withdraw API error:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
