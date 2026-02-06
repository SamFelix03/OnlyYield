import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, decodeEventLog, formatUnits, parseUnits, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet, polygon, arbitrum, optimism } from "viem/chains";
import { getSupabase } from "@/lib/supabase/server";
import { findDefaultToken } from '@lifi/data-types';
import { ChainId, CoinKey, createConfig, EVM, getRoutes, executeRoute, getStatus } from '@lifi/sdk';
import type { Chain } from 'viem';

const CHAIN_ID = 8453; // Base Mainnet

const CHAIN_CONFIG: Record<string, { chainId: ChainId; viemChain: Chain; name: string }> = {
  ethereum: { chainId: ChainId.ETH, viemChain: mainnet, name: 'Ethereum' },
  polygon: { chainId: ChainId.POL, viemChain: polygon, name: 'Polygon' },
  arbitrum: { chainId: ChainId.ARB, viemChain: arbitrum, name: 'Arbitrum' },
  optimism: { chainId: ChainId.OPT, viemChain: optimism, name: 'Optimism' },
  base: { chainId: ChainId.BAS, viemChain: base, name: 'Base' },
};

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v.trim();
}

function getRpcUrl() {
  return (
    process.env.BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    "https://mainnet.base.org"
  ).trim();
}

const YIELD_ORCHESTRATOR_ABI = [
  {
    name: "harvestStrategy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "strategy", type: "address" }],
    outputs: [],
  },
] as const;

const YIELD_STRATEGY_ABI = [
  {
    name: "claimUserYield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "claimedAmount", type: "uint256" }],
  },
  {
    name: "getUserYield",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "yieldAmount", type: "uint256" }],
  },
  {
    name: "UserYieldClaimed",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "claimer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function splitEqual(amount: bigint, recipients: string[]) {
  if (recipients.length === 0) return [];
  if (recipients.length === 1) return [{ to: recipients[0], amount }];
  const n = BigInt(recipients.length);
  const base = amount / n;
  const rem = amount - base * n;
  return recipients.map((to, i) => ({
    to,
    amount: i === 0 ? base + rem : base,
  }));
}

// Extract just the hash from a transaction hash/URL string
function extractTxHash(input: string | null | undefined): string | null {
  if (!input) return null;
  // If it's already just a hash (starts with 0x and is 66 chars), return it
  if (input.startsWith('0x') && input.length === 66) return input;
  // If it's a URL, extract the hash from it
  const match = input.match(/0x[a-fA-F0-9]{64}/);
  return match ? match[0] : input;
}

export async function POST() {
  const rpcUrl = getRpcUrl();
  const supabase = getSupabase();

  const operatorPk = requireEnv("OPERATOR_PRIVATE_KEY");
  const operator = privateKeyToAccount(operatorPk as `0x${string}`);
  const usdc = requireEnv("USDC_ADDRESS");
  const orchestrator = requireEnv("YIELD_ORCHESTRATOR_ADDRESS");
  const strategy = requireEnv("YIELD_STRATEGY_ADDRESS");

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account: operator, chain: base, transport: http(rpcUrl) });

  const decimals = (await publicClient.readContract({ address: usdc as `0x${string}`, abi: ERC20_ABI, functionName: "decimals" })) as number;

  const logs: string[] = [];
  const transactions: Array<{ type: string; hash: string; description: string; lifiExplorerLink?: string }> = [];

  try {
    // 1) Harvest/Report
    logs.push(`[1/4] Harvesting strategy...`);
    const harvestHash = await walletClient.writeContract({
      address: orchestrator as `0x${string}`,
      abi: YIELD_ORCHESTRATOR_ABI,
      functionName: "harvestStrategy",
      args: [strategy as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: harvestHash });
    transactions.push({ type: "harvest", hash: harvestHash, description: "Harvest strategy" });
    logs.push(`✅ Harvested: ${harvestHash}`);

    // 2) Get all non-withdrawn donations with recipients
    logs.push(`[2/4] Fetching non-withdrawn donations with recipients...`);
    const { data: donations, error: donationsErr } = await supabase
      .from("donations")
      .select("id, donor_wallet_address")
      .eq("withdrawn", false)
      .order("created_at", { ascending: true });
    if (donationsErr) throw new Error(donationsErr.message);

    if (!donations || donations.length === 0) {
      logs.push("ℹ️  No active (non-withdrawn) donations found");
      return NextResponse.json({ ok: true, logs, transactions });
    }

    logs.push(`Found ${donations.length} active donation(s)`);

    // 3) Process each donation
    let processedCount = 0;
    for (const donation of donations) {
      const donor = donation.donor_wallet_address;

      // Get recipients for this donation with their preferred chains
      const { data: sel, error: selErr } = await supabase
        .from("donation_recipient_selections")
        .select("recipient_wallet_address")
        .eq("donation_id", donation.id);
      if (selErr) {
        logs.push(`⚠️  Donation ${donation.id}: Error fetching recipients: ${selErr.message}`);
        continue;
      }
      const recipientAddresses = (sel || []).map((x) => x.recipient_wallet_address);
      
      // Fetch recipient details including preferred_chain
      const { data: recipientDetails } = await supabase
        .from("recipients")
        .select("wallet_address, preferred_chain")
        .in("wallet_address", recipientAddresses);
      
      const recipientMap = new Map<string, string | null>();
      (recipientDetails || []).forEach((r: any) => {
        recipientMap.set(r.wallet_address.toLowerCase(), r.preferred_chain || 'base');
      });
      
      const recipients = recipientAddresses;
      if (recipients.length === 0) {
        logs.push(`⏭️  Donation ${donation.id}: No recipients selected; skipping`);
        continue;
      }

      // Check yield
      const estYield = (await publicClient.readContract({
        address: strategy as `0x${string}`,
        abi: YIELD_STRATEGY_ABI,
        functionName: "getUserYield",
        args: [donor as `0x${string}`],
      })) as bigint;

      logs.push(`[3/4] Processing donation ${donation.id} (donor: ${donor.slice(0, 6)}...${donor.slice(-4)})`);
      logs.push(`  Actual yield from contract: ${formatUnits(estYield, decimals)} USDC`);
      logs.push(`  Recipients: ${recipients.length}`);

      // DEMO WORKAROUND: Artificially add 0.1 USDC per recipient for demo purposes
      // This ensures recipients receive a meaningful amount even if actual yield is very low
      const DEMO_YIELD_PER_RECIPIENT = parseUnits("0.1", decimals);
      const totalDemoYield = DEMO_YIELD_PER_RECIPIENT * BigInt(recipients.length);
      logs.push(`  🎭 DEMO MODE: Adding ${formatUnits(DEMO_YIELD_PER_RECIPIENT, decimals)} USDC per recipient (${formatUnits(totalDemoYield, decimals)} USDC total) for demo purposes`);
      logs.push(`  📊 Final yield amount to distribute: ${formatUnits(totalDemoYield, decimals)} USDC (${formatUnits(estYield, decimals)} actual + ${formatUnits(totalDemoYield, decimals)} demo)`);

      // Try to claim actual yield if it exists (but don't fail if it doesn't)
      let claimed = BigInt(0);
      let claimReceipt = null;
      
      if (estYield > BigInt(0)) {
        try {
          const claimHash = await walletClient.writeContract({
            address: strategy as `0x${string}`,
            abi: YIELD_STRATEGY_ABI,
            functionName: "claimUserYield",
            args: [donor as `0x${string}`],
          });
          claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
          transactions.push({ type: "claim", hash: claimHash, description: `Claim yield for donation ${donation.id}` });
          logs.push(`  ✅ Claimed actual yield: ${claimHash}`);

          // Extract claimed amount from event
          for (const log of claimReceipt.logs) {
            if (log.address.toLowerCase() !== strategy.toLowerCase()) continue;
            try {
              const decoded = decodeEventLog({ abi: YIELD_STRATEGY_ABI, data: log.data, topics: log.topics });
              if (decoded.eventName === "UserYieldClaimed") {
                const args = decoded.args as { user: `0x${string}`; claimer: `0x${string}`; amount: bigint };
                if (args.user.toLowerCase() === donor.toLowerCase() && args.claimer.toLowerCase() === operator.address.toLowerCase()) {
                  claimed = args.amount;
                  break;
                }
              }
            } catch {}
          }
        } catch (e: any) {
          logs.push(`  ⚠️  Could not claim actual yield (${e?.shortMessage || e?.message || e}), proceeding with demo amount only`);
        }
      } else {
        logs.push(`  ℹ️  No actual yield to claim, using demo amount only`);
      }

      // Check operator balance (for both claimed yield and demo amount)
      await new Promise((r) => setTimeout(r, 1500));
      const operatorBal = (await publicClient.readContract({
        address: usdc as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [operator.address],
      })) as bigint;

      // Use demo yield amount (0.1 USDC per recipient) regardless of actual yield
      // This ensures recipients always get a meaningful demo amount
      const distributionAmount = totalDemoYield;
      
      if (operatorBal < distributionAmount) {
        logs.push(`  ⚠️  Operator balance (${formatUnits(operatorBal, decimals)} USDC) is less than required (${formatUnits(distributionAmount, decimals)} USDC)`);
        logs.push(`  ⚠️  Will distribute available balance: ${formatUnits(operatorBal, decimals)} USDC`);
      }

      const actual = operatorBal < distributionAmount ? operatorBal : distributionAmount;
      if (actual === BigInt(0)) {
        logs.push(`  ⚠️  Operator balance is 0; cannot distribute`);
        continue;
      }

      // Split and transfer/bridge
      logs.push(`[4/4] Distributing ${formatUnits(actual, decimals)} USDC (demo yield amount) to ${recipients.length} recipient(s)...`);
      logs.push(`  🎭 DEMO MODE: Each recipient will receive ~${formatUnits(actual / BigInt(recipients.length), decimals)} USDC`);
      const transfers = splitEqual(actual, recipients);
      
      // Setup LI.FI SDK
      const switchChains = [mainnet, arbitrum, optimism, polygon, base];
      const lifiClient = walletClient.extend(publicActions);
      
      createConfig({
        integrator: 'creator-support',
        providers: [
          EVM({
            getWalletClient: () => Promise.resolve(lifiClient),
            switchChain: (chainId: number) =>
              Promise.resolve(
                createWalletClient({
                  account: operator,
                  chain: switchChains.find(
                    (chain) => chain.id === chainId
                  ) as Chain,
                  transport: http(rpcUrl),
                }).extend(publicActions)
              ),
          }),
        ],
      });
      
      for (const t of transfers) {
        if (t.amount === BigInt(0)) continue;
        
        const recipientAddress = t.to.toLowerCase();
        const preferredChain = recipientMap.get(recipientAddress) || 'base';
        const targetChainConfig = CHAIN_CONFIG[preferredChain];
        
        if (!targetChainConfig) {
          logs.push(`  ⚠️  Invalid preferred chain "${preferredChain}" for ${t.to.slice(0, 6)}...${t.to.slice(-4)}; skipping`);
          continue;
        }
        
        // If same chain (Base), do direct transfer
        if (preferredChain === 'base') {
          logs.push(`  🎭 DEMO MODE: Transferring ${formatUnits(t.amount, decimals)} USDC (demo yield) to ${t.to.slice(0, 6)}...${t.to.slice(-4)} on Base...`);
          const transferHash = await walletClient.writeContract({
            address: usdc as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [t.to as `0x${string}`, t.amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: transferHash });
          transactions.push({
            type: "transfer",
            hash: transferHash,
            description: `Transfer ${formatUnits(t.amount, decimals)} USDC (demo yield) to ${t.to.slice(0, 6)}...${t.to.slice(-4)} (Base)`,
          });

          // Record in Supabase (ensure only hashes are stored, not URLs)
          const amountHuman = formatUnits(t.amount, decimals);
          // Use claim receipt hash if available, otherwise use transfer hash (for demo mode)
          // The database requires claimed_tx_hash to be NOT NULL, so we use transfer hash as fallback
          const claimedTxHash = extractTxHash(claimReceipt?.transactionHash) || extractTxHash(transferHash);
          
          await supabase.from("yield_distributions").insert({
            chain_id: CHAIN_ID,
            donation_id: donation.id,
            donor_wallet_address: donor,
            recipient_wallet_address: t.to,
            claimed_tx_hash: claimedTxHash,
            transfer_tx_hash: extractTxHash(transferHash) || null,
            amount_base_units: t.amount.toString(),
            amount: amountHuman,
          });

          logs.push(`  ✅ Sent ${amountHuman} USDC (demo yield amount) to ${t.to.slice(0, 6)}...${t.to.slice(-4)} on Base (${transferHash})`);
        } else {
          // Bridge to recipient's preferred chain using LI.FI
          try {
            logs.push(`  🎭 DEMO MODE: Bridging ${formatUnits(t.amount, decimals)} USDC (demo yield) to ${targetChainConfig.name} for ${t.to.slice(0, 6)}...${t.to.slice(-4)}...`);
            
            const baseUsdc = findDefaultToken(CoinKey.USDC, ChainId.BAS);
            const targetUsdc = findDefaultToken(CoinKey.USDC, targetChainConfig.chainId);
            
            if (!baseUsdc || !targetUsdc) {
              logs.push(`  ❌ USDC not found on ${targetChainConfig.name}; skipping`);
              continue;
            }
            
            const routeRequest = {
              toAddress: t.to as `0x${string}`,
              fromAddress: operator.address,
              fromChainId: ChainId.BAS,
              fromAmount: t.amount.toString(),
              fromTokenAddress: baseUsdc.address,
              toChainId: targetChainConfig.chainId,
              toTokenAddress: targetUsdc.address,
              options: {
                slippage: 0.03, // 3%
              },
            };
            
            const routeResponse = await getRoutes(routeRequest);
            if (!routeResponse.routes || routeResponse.routes.length === 0) {
              logs.push(`  ❌ No route found to ${targetChainConfig.name}; skipping`);
              continue;
            }
            
            const route = routeResponse.routes[0];
            logs.push(`  📍 Route found: ${route.steps.length} step(s)`);
            
            // Track route execution with update hook
            let bridgeTxHash = '';
            let sourceTxHash = ''; // Source chain transaction hash for explorer link
            const executionOptions = {
              updateRouteHook: (updatedRoute: any) => {
                // Track execution progress
                for (const step of updatedRoute.steps || []) {
                  const exec = (step as any).execution;
                  if (exec?.status === 'DONE' && exec?.process) {
                    for (const process of exec.process) {
                      if (process.txHash) {
                        // First transaction hash is usually the source chain transaction
                        if (!sourceTxHash) {
                          sourceTxHash = process.txHash;
                        }
                        bridgeTxHash = process.txHash;
                        logs.push(`  📝 Step ${(step as any).id} completed: ${process.txHash}`);
                      }
                    }
                  }
                }
              },
            };
            
            // Execute bridge
            await executeRoute(route as any, executionOptions);
            
            // Wait a bit for route execution to complete and update
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Extract transaction hash from route after execution
            // Check the last step's execution for the final transaction hash
            if (!bridgeTxHash) {
              for (const step of (route as any).steps || []) {
                const exec = (step as any).execution;
                if (exec?.status === 'DONE' && exec?.process) {
                  for (const process of exec.process) {
                    if (process.txHash) {
                      if (!sourceTxHash) {
                        sourceTxHash = process.txHash;
                      }
                      bridgeTxHash = process.txHash;
                    }
                  }
                }
              }
            }
            
            // Fallback: use the first step's transaction hash if available
            if (!bridgeTxHash) {
              const firstStep = (route as any).steps?.[0];
              if (firstStep?.transactionRequest) {
                const txReq = firstStep.transactionRequest as any;
                if (txReq.txHash) {
                  sourceTxHash = txReq.txHash;
                  bridgeTxHash = txReq.txHash;
                }
              }
            }
            
            // Additional fallback: check route status after execution
            if (!bridgeTxHash && (route as any).steps?.length > 0) {
              const firstStep = (route as any).steps[0];
              if (firstStep?.transactionHash) {
                bridgeTxHash = firstStep.transactionHash;
                sourceTxHash = firstStep.transactionHash;
              }
            }

            // Use source transaction hash for explorer link (from Base chain)
            const txHashForExplorer = sourceTxHash || bridgeTxHash;

            // Get LI.FI explorer link from status
            let lifiExplorerLink: string | null = null;
            if (txHashForExplorer) {
              try {
                // Get tool from route (could be in toolDetails or steps)
                const routeTool = (route as any).tool || (route as any).toolDetails?.key || (route as any).steps?.[0]?.tool;
                if (routeTool) {
                  const status: any = await getStatus({
                    txHash: txHashForExplorer,
                    bridge: routeTool,
                    fromChain: ChainId.BAS,
                    toChain: targetChainConfig.chainId,
                  });
                  // Extract explorer link from status (could be in different locations)
                  lifiExplorerLink = status?.lifiExplorerLink || status?.receiving?.txLink || status?.sending?.txLink || null;
                  if (lifiExplorerLink) {
                    logs.push(`  🔗 LI.FI Explorer: ${lifiExplorerLink}`);
                  }
                }
              } catch (e: any) {
                // If status check fails, continue without explorer link
                logs.push(`  ⚠️  Could not fetch LI.FI explorer link: ${e?.message || String(e)}`);
              }
            }
            
            transactions.push({
              type: "bridge",
              hash: bridgeTxHash || 'pending',
              description: `Bridge ${formatUnits(t.amount, decimals)} USDC (demo yield) to ${targetChainConfig.name} for ${t.to.slice(0, 6)}...${t.to.slice(-4)}`,
              lifiExplorerLink: lifiExplorerLink || undefined,
            });

            // Record in Supabase - MUST record if bridge execution succeeded
            // Even if we don't have the exact tx hash, we record with what we have
            const amountHuman = formatUnits(t.amount, decimals);
            const finalBridgeTxHash = extractTxHash(bridgeTxHash) || extractTxHash(sourceTxHash) || 'pending';
            
            // Use claim receipt hash if available, otherwise use bridge hash (for demo mode)
            // The database requires claimed_tx_hash to be NOT NULL, so we use bridge hash as fallback
            const claimedTxHash = extractTxHash(claimReceipt?.transactionHash) || finalBridgeTxHash;
            
            try {
              const { error: insertError } = await supabase.from("yield_distributions").insert({
                chain_id: targetChainConfig.chainId,
                donation_id: donation.id,
                donor_wallet_address: donor,
                recipient_wallet_address: t.to,
                claimed_tx_hash: claimedTxHash,
                transfer_tx_hash: finalBridgeTxHash,
                amount_base_units: t.amount.toString(),
                amount: amountHuman,
              });
              
              if (insertError) {
                logs.push(`  ⚠️  Failed to record yield distribution in DB: ${insertError.message}`);
                // Don't throw - bridge succeeded, just DB recording failed
              } else {
                logs.push(`  ✅ Recorded yield distribution in database (chain: ${targetChainConfig.chainId}, tx: ${finalBridgeTxHash})`);
              }
            } catch (dbError: any) {
              logs.push(`  ⚠️  Database error recording yield distribution: ${dbError?.message || String(dbError)}`);
              // Don't throw - bridge succeeded, just DB recording failed
            }

            const explorerMsg = lifiExplorerLink 
              ? ` 🔗 Track: ${lifiExplorerLink}` 
              : bridgeTxHash 
                ? ` (${bridgeTxHash})` 
                : '';
            logs.push(`  ✅ Bridged ${amountHuman} USDC (demo yield amount) to ${t.to.slice(0, 6)}...${t.to.slice(-4)} on ${targetChainConfig.name}${explorerMsg}`);
          } catch (e: any) {
            logs.push(`  ❌ Bridge failed for ${t.to.slice(0, 6)}...${t.to.slice(-4)}: ${e?.message || String(e)}`);
            continue;
          }
        }
      }

      processedCount++;
    }

    logs.push(`\n✅ Distribution complete! Processed ${processedCount} donation(s)`);
    return NextResponse.json({ ok: true, logs, transactions, processedCount });
  } catch (error: any) {
    logs.push(`\n❌ Error: ${error?.message || String(error)}`);
    return NextResponse.json({ ok: false, error: error?.message || String(error), logs, transactions }, { status: 500 });
  }
}
