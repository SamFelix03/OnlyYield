#!/usr/bin/env tsx
/**
 * Orchestrator Claiming Flow Test Script
 * 
 * This script tests the orchestrator claiming flow:
 * 1. Two users deposit different USDC amounts
 * 2. Operator supplies funds to Aave
 * 3. Wait for yield to accrue
 * 4. Operator calls report() to update yield tracking
 * 5. Orchestrator claims yield for each user
 * 6. Orchestrator sends yield to respective recipients:
 *    - Depositor 1 yield → Recipient 1
 *    - Depositor 2 yield → Recipient 2 and 3
 * 
 * Environment Variables Required:
 * - DEPOSITOR_1_PRIVATE_KEY: Private key of depositor 1
 * - DEPOSITOR_2_PRIVATE_KEY: Private key of depositor 2
 * - OPERATOR_PRIVATE_KEY: Private key of operator wallet
 * - BASE_SEPOLIA_RPC_URL: RPC URL for Base Sepolia
 * - YIELD_ORCHESTRATOR_ADDRESS: Address of YieldOrchestrator contract
 * - YIELD_STRATEGY_ADDRESS: Address of YieldStrategy contract
 * - USDC_ADDRESS: USDC token address on Base Sepolia
 * - RECIPIENT_1, RECIPIENT_2, RECIPIENT_3: Recipient addresses
 * - DEPOSIT_1_AMOUNT_USDC: Amount for depositor 1 (defaults to 100)
 * - DEPOSIT_2_AMOUNT_USDC: Amount for depositor 2 (defaults to 200)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

// Load .env file from scripts directory
config({ path: resolve(__dirname, ".env") });

import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, type Hex, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Load ABIs from JSON files
const YIELD_STRATEGY_ABI_JSON = JSON.parse(readFileSync(resolve(__dirname, "abis/yield-strategy.json"), "utf-8"));

// Minimal ABIs for contract interactions
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
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
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
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
] as const;

const YIELD_ORCHESTRATOR_ABI = [
  {
    name: "depositERC20",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "inputAsset", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "targetAsset", type: "address" },
      { name: "minAmountOut", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
  },
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
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "vault",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "report",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [
      { name: "profit", type: "uint256" },
      { name: "loss", type: "uint256" },
    ],
  },
  {
    name: "getUserYield",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "yieldAmount", type: "uint256" }],
  },
  {
    name: "claimUserYield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "claimedAmount", type: "uint256" }],
  },
] as const;

const VAULT_ABI = [
  {
    name: "idleUnderlying",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "supplyToAave",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "aTokenBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Helper to get env var or throw
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

// Helper to get env var with default
function getEnv(key: string, defaultValue: string): string {
  return process.env[key]?.trim() || defaultValue;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTransaction(client: any, hash: `0x${string}`) {
  console.log(`⏳ Waiting for transaction: ${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash }) as any;
  console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function main() {
  console.log("🚀 Starting Orchestrator Claiming Flow Test Script\n");

  // Load configuration from environment
  const depositor1PrivateKey = requireEnv("DEPOSITOR_1_PRIVATE_KEY") as Hex;
  const depositor2PrivateKey = requireEnv("DEPOSITOR_2_PRIVATE_KEY") as Hex;
  const operatorPrivateKey = requireEnv("OPERATOR_PRIVATE_KEY") as Hex;

  if (!depositor1PrivateKey.startsWith("0x") || !depositor2PrivateKey.startsWith("0x") || !operatorPrivateKey.startsWith("0x")) {
    throw new Error("Private keys must start with 0x");
  }

  const rpcUrl = getEnv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org");
  const orchestratorAddress = requireEnv("YIELD_ORCHESTRATOR_ADDRESS") as `0x${string}`;
  const strategyAddress = requireEnv("YIELD_STRATEGY_ADDRESS") as `0x${string}`;
  const usdcAddress = requireEnv("USDC_ADDRESS") as `0x${string}`;
  const recipient1 = requireEnv("RECIPIENT_1") as `0x${string}`;
  const recipient2 = requireEnv("RECIPIENT_2") as `0x${string}`;
  const recipient3 = requireEnv("RECIPIENT_3") as `0x${string}`;
  const deposit1AmountUsdc = parseFloat(getEnv("DEPOSIT_1_AMOUNT_USDC", "100"));
  const deposit2AmountUsdc = parseFloat(getEnv("DEPOSIT_2_AMOUNT_USDC", "200"));

  console.log("📋 Configuration:");
  console.log(`   RPC URL: ${rpcUrl}`);
  console.log(`   Orchestrator: ${orchestratorAddress}`);
  console.log(`   Strategy: ${strategyAddress}`);
  console.log(`   USDC: ${usdcAddress}`);
  console.log(`   Depositor 1 will deposit: ${deposit1AmountUsdc} USDC → Recipient: ${recipient1}`);
  console.log(`   Depositor 2 will deposit: ${deposit2AmountUsdc} USDC → Recipients: ${recipient2}, ${recipient3}\n`);

  // Setup clients
  const depositor1Account = privateKeyToAccount(depositor1PrivateKey);
  const depositor2Account = privateKeyToAccount(depositor2PrivateKey);
  const operatorAccount = privateKeyToAccount(operatorPrivateKey);
  
  const depositor1WalletClient = createWalletClient({
    account: depositor1Account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  
  const depositor2WalletClient = createWalletClient({
    account: depositor2Account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  
  const operatorWalletClient = createWalletClient({
    account: operatorAccount,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  console.log(`👤 Depositor 1 Address: ${depositor1Account.address}`);
  console.log(`👤 Depositor 2 Address: ${depositor2Account.address}`);
  console.log(`🤖 Operator Address: ${operatorAccount.address}\n`);

  // Get USDC decimals
  const usdcDecimals = (await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  })) as number;

  const deposit1Amount = parseUnits(deposit1AmountUsdc.toString(), usdcDecimals);
  const deposit2Amount = parseUnits(deposit2AmountUsdc.toString(), usdcDecimals);

  // ========== STEP 1: Depositor 1 deposits (via operator) ==========
  console.log("💰 Step 1: Depositor 1 Depositing USDC (via Operator)");
  const balance1 = (await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [depositor1Account.address],
  })) as bigint;

  if (balance1 < deposit1Amount) {
    throw new Error(`Depositor 1 insufficient USDC. Have ${formatUnits(balance1, usdcDecimals)}, need ${deposit1AmountUsdc}`);
  }

  // Approve orchestrator to pull tokens from depositor 1
  let allowance1 = (await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [depositor1Account.address, orchestratorAddress],
  })) as bigint;

  if (allowance1 < deposit1Amount) {
    console.log(`   🔐 Approving orchestrator to spend ${deposit1AmountUsdc} USDC from depositor 1...`);
    const approveHash1 = await depositor1WalletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [orchestratorAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
    });
    await waitForTransaction(publicClient, approveHash1);
    
    // Re-check allowance to confirm
    await sleep(2000);
    allowance1 = (await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [depositor1Account.address, orchestratorAddress],
    })) as bigint;
    console.log(`   ✅ Allowance confirmed: ${formatUnits(allowance1, usdcDecimals)} USDC`);
  } else {
    console.log(`   ✅ Already approved: ${formatUnits(allowance1, usdcDecimals)} USDC`);
  }

  // Check strategy balance before deposit
  const strategyBalanceBefore1 = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalAssets",
  })) as bigint;
  console.log(`   📊 Strategy total assets before: ${formatUnits(strategyBalanceBefore1, usdcDecimals)} USDC`);

  // Operator calls depositERC20 on behalf of depositor 1
  const depositHash1 = await operatorWalletClient.writeContract({
    address: orchestratorAddress,
    abi: YIELD_ORCHESTRATOR_ABI,
    functionName: "depositERC20",
    args: [
      depositor1Account.address, // from (user's address)
      usdcAddress,
      deposit1Amount,
      usdcAddress,
      BigInt(0),
      depositor1Account.address, // receiver (gets shares)
    ],
  });
  await waitForTransaction(publicClient, depositHash1);
  
  // Check strategy balance after deposit
  await sleep(2000);
  const strategyBalanceAfter1 = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalAssets",
  })) as bigint;
  const actualDeposit1 = strategyBalanceAfter1 - strategyBalanceBefore1;
  console.log(`   📊 Strategy total assets after: ${formatUnits(strategyBalanceAfter1, usdcDecimals)} USDC`);
  console.log(`   📊 Actual deposit amount: ${formatUnits(actualDeposit1, usdcDecimals)} USDC (expected: ${deposit1AmountUsdc} USDC)`);
  console.log(`   ✅ Depositor 1 deposited ${formatUnits(actualDeposit1, usdcDecimals)} USDC\n`);

  // ========== STEP 2: Depositor 2 deposits (via operator) ==========
  console.log("💰 Step 2: Depositor 2 Depositing USDC (via Operator)");
  const balance2 = (await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [depositor2Account.address],
  })) as bigint;

  if (balance2 < deposit2Amount) {
    throw new Error(`Depositor 2 insufficient USDC. Have ${formatUnits(balance2, usdcDecimals)}, need ${deposit2AmountUsdc}`);
  }

  // Approve orchestrator to pull tokens from depositor 2
  let allowance2 = (await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [depositor2Account.address, orchestratorAddress],
  })) as bigint;

  if (allowance2 < deposit2Amount) {
    console.log(`   🔐 Approving orchestrator to spend ${deposit2AmountUsdc} USDC from depositor 2...`);
    const approveHash2 = await depositor2WalletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [orchestratorAddress, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
    });
    await waitForTransaction(publicClient, approveHash2);
    
    // Re-check allowance to confirm
    await sleep(2000);
    allowance2 = (await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [depositor2Account.address, orchestratorAddress],
    })) as bigint;
    console.log(`   ✅ Allowance confirmed: ${formatUnits(allowance2, usdcDecimals)} USDC`);
  } else {
    console.log(`   ✅ Already approved: ${formatUnits(allowance2, usdcDecimals)} USDC`);
  }

  // Check strategy balance before deposit
  const strategyBalanceBefore2 = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalAssets",
  })) as bigint;
  console.log(`   📊 Strategy total assets before: ${formatUnits(strategyBalanceBefore2, usdcDecimals)} USDC`);

  // Operator calls depositERC20 on behalf of depositor 2
  const depositHash2 = await operatorWalletClient.writeContract({
    address: orchestratorAddress,
    abi: YIELD_ORCHESTRATOR_ABI,
    functionName: "depositERC20",
    args: [
      depositor2Account.address, // from (user's address)
      usdcAddress,
      deposit2Amount,
      usdcAddress,
      BigInt(0),
      depositor2Account.address, // receiver (gets shares)
    ],
  });
  await waitForTransaction(publicClient, depositHash2);
  
  // Check strategy balance after deposit
  await sleep(2000);
  const strategyBalanceAfter2 = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalAssets",
  })) as bigint;
  const actualDeposit2 = strategyBalanceAfter2 - strategyBalanceBefore2;
  console.log(`   📊 Strategy total assets after: ${formatUnits(strategyBalanceAfter2, usdcDecimals)} USDC`);
  console.log(`   📊 Actual deposit amount: ${formatUnits(actualDeposit2, usdcDecimals)} USDC (expected: ${deposit2AmountUsdc} USDC)`);
  console.log(`   ✅ Depositor 2 deposited ${formatUnits(actualDeposit2, usdcDecimals)} USDC\n`);

  // ========== STEP 3: Operator supplies to Aave ==========
  console.log("🤖 Step 3: Operator Supplying Funds to Aave");
  const vaultAddress = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "vault",
  })) as `0x${string}`;

  // Check vault state before supply
  const idleBalance = (await publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "idleUnderlying",
  })) as bigint;
  
  const aTokenBalanceBefore = (await publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "aTokenBalance",
  })) as bigint;
  
  const strategyTotalAssets = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "totalAssets",
  })) as bigint;
  
  console.log(`   📊 Strategy total assets: ${formatUnits(strategyTotalAssets, usdcDecimals)} USDC`);
  console.log(`   📊 Vault idle balance: ${formatUnits(idleBalance, usdcDecimals)} USDC`);
  console.log(`   📊 Vault aToken balance (already in Aave): ${formatUnits(aTokenBalanceBefore, usdcDecimals)} USDC`);
  console.log(`   📊 Total in vault: ${formatUnits(idleBalance + aTokenBalanceBefore, usdcDecimals)} USDC`);

  if (idleBalance > BigInt(0)) {
    const supplyHash = await operatorWalletClient.writeContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "supplyToAave",
      args: [idleBalance],
    });
    await waitForTransaction(publicClient, supplyHash);
    
    // Check vault state after supply
    await sleep(2000);
    const aTokenBalanceAfter = (await publicClient.readContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "aTokenBalance",
    })) as bigint;
    
    console.log(`   ✅ Supplied ${formatUnits(idleBalance, usdcDecimals)} USDC to Aave`);
    console.log(`   📊 Vault aToken balance after: ${formatUnits(aTokenBalanceAfter, usdcDecimals)} USDC`);
    console.log(`   📊 Total now in Aave: ${formatUnits(aTokenBalanceAfter, usdcDecimals)} USDC\n`);
    
    // Wait a bit for state to settle
    await sleep(1000);
  } else {
    console.log(`   ℹ️  No idle funds to supply\n`);
  }

  // ========== STEP 4: Wait for yield ==========
  console.log("⏱️  Step 4: Waiting 1 minute for yield to accrue...");
  const waitTime = 60 * 1000;
  const startTime = Date.now();
  let elapsed = 0;
  const interval = setInterval(() => {
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\r   ⏳ Elapsed: ${elapsed}s / 60s`);
  }, 1000);
  await sleep(waitTime);
  clearInterval(interval);
  console.log("\n   ✅ Wait complete\n");

  // ========== STEP 5: Operator calls report() (first call - sets baseline) ==========
  console.log("📊 Step 5: Operator Calling report() to Set Baseline");
  await sleep(2000); // Small delay to ensure nonce is correct
  const reportHash1 = await operatorWalletClient.writeContract({
    address: orchestratorAddress,
    abi: YIELD_ORCHESTRATOR_ABI,
    functionName: "harvestStrategy",
    args: [strategyAddress],
  });
  await waitForTransaction(publicClient, reportHash1);
  console.log(`   ✅ Baseline report called\n`);

  // ========== STEP 5.5: Wait 2 more minutes for yield to accrue ==========
  console.log("⏱️  Step 5.5: Waiting 2 more minutes for yield to accrue...");
  const waitTime2 = 2 * 60 * 1000; // 2 minutes
  const startTime2 = Date.now();
  let elapsed2 = 0;
  const interval2 = setInterval(() => {
    elapsed2 = Math.floor((Date.now() - startTime2) / 1000);
    process.stdout.write(`\r   ⏳ Elapsed: ${elapsed2}s / 120s`);
  }, 1000);
  await sleep(waitTime2);
  clearInterval(interval2);
  console.log("\n   ✅ Wait complete\n");

  // ========== STEP 5.6: Operator calls report() again (captures yield) ==========
  console.log("📊 Step 5.6: Operator Calling report() Again to Capture Yield");
  await sleep(2000); // Small delay to ensure nonce is correct
  const reportHash2 = await operatorWalletClient.writeContract({
    address: orchestratorAddress,
    abi: YIELD_ORCHESTRATOR_ABI,
    functionName: "harvestStrategy",
    args: [strategyAddress],
  });
  await waitForTransaction(publicClient, reportHash2);
  console.log(`   ✅ Yield report called\n`);

  // ========== STEP 6: Check user yields ==========
  console.log("📊 Step 6: Checking User Yields");
  const user1Yield = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "getUserYield",
    args: [depositor1Account.address],
  })) as bigint;

  const user2Yield = (await publicClient.readContract({
    address: strategyAddress,
    abi: YIELD_STRATEGY_ABI,
    functionName: "getUserYield",
    args: [depositor2Account.address],
  })) as bigint;

  console.log(`   Depositor 1 Yield: ${formatUnits(user1Yield, usdcDecimals)} USDC`);
  console.log(`   Depositor 2 Yield: ${formatUnits(user2Yield, usdcDecimals)} USDC\n`);

  // ========== STEP 7: Orchestrator claims and distributes ==========
  console.log("🎯 Step 7: Orchestrator Claiming and Distributing Yield\n");

  // Define depositors and their recipients
  const depositors = [
    {
      address: depositor1Account.address,
      yield: user1Yield,
      recipients: [recipient1],
      name: "Depositor 1",
    },
    {
      address: depositor2Account.address,
      yield: user2Yield,
      recipients: [recipient2, recipient3], // Split 50/50
      name: "Depositor 2",
    },
  ];

  const claimedAmounts: bigint[] = [];

  // Loop through each depositor
  for (let i = 0; i < depositors.length; i++) {
    const depositor = depositors[i];
    
    if (depositor.yield <= BigInt(0)) {
      console.log(`   ⏭️  Skipping ${depositor.name} - no yield to claim\n`);
      claimedAmounts.push(BigInt(0));
      continue;
    }

    console.log(`   Claiming yield for ${depositor.name} (${formatUnits(depositor.yield, usdcDecimals)} USDC)...`);
    
    try {
      // Claim yield
      const claimHash = await operatorWalletClient.writeContract({
        address: strategyAddress,
        abi: YIELD_STRATEGY_ABI,
        functionName: "claimUserYield",
        args: [depositor.address],
      });
      const receipt = await waitForTransaction(publicClient, claimHash);

      // Extract claimed amount from the UserYieldClaimed event in the transaction receipt
      let claimedAmount = BigInt(0);
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === strategyAddress.toLowerCase()) {
          try {
            const decoded = decodeEventLog({
              abi: YIELD_STRATEGY_ABI_JSON,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: { user: `0x${string}`; claimer: `0x${string}`; amount: bigint } };
            
            if (decoded.eventName === "UserYieldClaimed" && decoded.args) {
              if (decoded.args.user.toLowerCase() === depositor.address.toLowerCase()) {
                claimedAmount = decoded.args.amount;
                break;
              }
            }
          } catch {
            // Not the event we're looking for, continue
          }
        }
      }

      if (claimedAmount === BigInt(0)) {
        throw new Error("Could not extract claimed amount from transaction logs");
      }

      // Verify operator actually received the funds
      await sleep(2000);
      const operatorBalance = (await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [operatorAccount.address],
      })) as bigint;

      // Use the actual balance if it's less than claimed (shouldn't happen, but safety check)
      const actualAmount = operatorBalance < claimedAmount ? operatorBalance : claimedAmount;
      claimedAmounts.push(actualAmount);
      console.log(`   ✅ Claimed ${formatUnits(claimedAmount, usdcDecimals)} USDC`);
      console.log(`   📊 Operator balance: ${formatUnits(operatorBalance, usdcDecimals)} USDC`);

      // Send to recipient(s)
      if (actualAmount > BigInt(0)) {
        if (depositor.recipients.length === 1) {
          // Single recipient - send all
          const sendHash = await operatorWalletClient.writeContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [depositor.recipients[0], actualAmount],
          });
          await waitForTransaction(publicClient, sendHash);
          console.log(`   ✅ Sent ${formatUnits(actualAmount, usdcDecimals)} USDC to ${depositor.recipients[0]}\n`);
        } else {
          // Multiple recipients - split 50/50
          const half = actualAmount / BigInt(2);
          const remainder = actualAmount - (half * BigInt(2));

          // Send to first recipient (50% + remainder)
          const sendHash1 = await operatorWalletClient.writeContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [depositor.recipients[0], half + remainder],
          });
          await waitForTransaction(publicClient, sendHash1);
          console.log(`   ✅ Sent ${formatUnits(half + remainder, usdcDecimals)} USDC to ${depositor.recipients[0]}`);

          // Send to second recipient (50%)
          if (half > BigInt(0)) {
            const sendHash2 = await operatorWalletClient.writeContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "transfer",
              args: [depositor.recipients[1], half],
            });
            await waitForTransaction(publicClient, sendHash2);
            console.log(`   ✅ Sent ${formatUnits(half, usdcDecimals)} USDC to ${depositor.recipients[1]}\n`);
          }
        }
      }
    } catch (error: any) {
      if (error?.reason?.includes("no yield") || error?.shortMessage?.includes("no yield")) {
        console.log(`   ⚠️  No yield to claim\n`);
        claimedAmounts.push(BigInt(0));
      } else {
        throw error;
      }
    }
  }

  // ========== Final Summary ==========
  console.log("\n📊 Final Summary:");

  console.log(`\n   Depositor 1:`);
  console.log(`      Deposit: ${deposit1AmountUsdc} USDC`);
  console.log(`      Yield Generated: ${formatUnits(user1Yield, usdcDecimals)} USDC`);
  console.log(`      Yield Claimed: ${formatUnits(claimedAmounts[0], usdcDecimals)} USDC`);
  console.log(`      → Sent to Recipient 1: ${formatUnits(claimedAmounts[0], usdcDecimals)} USDC`);

  console.log(`\n   Depositor 2:`);
  console.log(`      Deposit: ${deposit2AmountUsdc} USDC`);
  console.log(`      Yield Generated: ${formatUnits(user2Yield, usdcDecimals)} USDC`);
  console.log(`      Yield Claimed: ${formatUnits(claimedAmounts[1], usdcDecimals)} USDC`);
  if (claimedAmounts[1] > BigInt(0)) {
    const half = claimedAmounts[1] / BigInt(2);
    const remainder = claimedAmounts[1] - (half * BigInt(2));
    console.log(`      → Sent to Recipient 2: ${formatUnits(half + remainder, usdcDecimals)} USDC (50% + remainder)`);
    console.log(`      → Sent to Recipient 3: ${formatUnits(half, usdcDecimals)} USDC (50%)`);
    console.log(`      → Total distributed: ${formatUnits(claimedAmounts[1], usdcDecimals)} USDC`);
  } else {
    console.log(`      → No yield to distribute`);
  }

  console.log("\n✅ Flow Complete!\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
