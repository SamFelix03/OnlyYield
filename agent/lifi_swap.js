/**
 * LI.FI Token Swap Helper Script
 * Called by Python agent to execute token swaps on Base Mainnet
 * 
 * Usage: node lifi_swap.js <fromToken> <toToken> <amount> <privateKey> <recipient>
 * 
 * Example: node lifi_swap.js USDC USDT 1000000 0x... 0x...
 * 
 * Note: Run from project root: node agent/lifi_swap.js ...
 */

const path = require('path');

// Try to load from lifi-sdk workspace
let findDefaultToken, ChainId, CoinKey, createConfig, EVM, executeRoute, getRoutes;
let createWalletClient, http, privateKeyToAccount, base;

try {
  // Try loading from lifi-sdk directory
  const lifiSdkPath = path.resolve(__dirname, '../lifi-sdk/packages/sdk');
  const lifiDataTypesPath = path.resolve(__dirname, '../lifi-sdk/packages/sdk');
  
  // For now, we'll require the user to have installed dependencies
  // In production, this should use the workspace setup
  const sdk = require('@lifi/sdk');
  const dataTypes = require('@lifi/data-types');
  const viem = require('viem');
  const viemAccounts = require('viem/accounts');
  const viemChains = require('viem/chains');
  
  findDefaultToken = dataTypes.findDefaultToken;
  ChainId = sdk.ChainId;
  CoinKey = sdk.CoinKey;
  createConfig = sdk.createConfig;
  EVM = sdk.EVM;
  executeRoute = sdk.executeRoute;
  getRoutes = sdk.getRoutes;
  createWalletClient = viem.createWalletClient;
  http = viem.http;
  privateKeyToAccount = viemAccounts.privateKeyToAccount;
  base = viemChains.base;
} catch (e) {
  console.error('Error loading dependencies. Make sure @lifi/sdk and viem are installed.');
  console.error('Run: npm install @lifi/sdk viem (from project root or agent directory)');
  process.exit(1);
}

async function swapTokens(fromTokenKey, toTokenKey, amount, privateKey, recipient) {
  try {
    console.log(`[LI.FI Swap] Starting swap: ${fromTokenKey} -> ${toTokenKey}, Amount: ${amount}`);
    
    // Convert token keys to CoinKey enum
    const coinKeyMap = {
      'USDC': CoinKey.USDC,
      'USDT': CoinKey.USDT,
      'DAI': CoinKey.DAI,
      'USDC.E': CoinKey.USDC,  // USDC.e uses same CoinKey as USDC
    };
    
    const fromCoinKey = coinKeyMap[fromTokenKey.toUpperCase()];
    const toCoinKey = coinKeyMap[toTokenKey.toUpperCase()];
    
    if (!fromCoinKey || !toCoinKey) {
      throw new Error(`Invalid token: ${fromTokenKey} or ${toTokenKey}`);
    }
    
    // Get token addresses on Base
    const fromToken = findDefaultToken(fromCoinKey, ChainId.BAS);
    const toToken = findDefaultToken(toCoinKey, ChainId.BAS);
    
    if (!fromToken || !toToken) {
      throw new Error(`Token not found on Base: ${fromTokenKey} or ${toTokenKey}`);
    }
    
    console.log(`[LI.FI Swap] From: ${fromToken.address}, To: ${toToken.address}`);
    
    // Setup wallet client
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });
    
    // Configure LI.FI SDK
    createConfig({
      integrator: 'onlyyield-agent',
      providers: [
        EVM({
          getWalletClient: () => Promise.resolve(client),
        }),
      ],
    });
    
    // Request route
    const routeRequest = {
      toAddress: recipient,
      fromAddress: account.address,
      fromChainId: ChainId.BAS,
      fromAmount: amount.toString(),
      fromTokenAddress: fromToken.address,
      toChainId: ChainId.BAS,
      toTokenAddress: toToken.address,
      options: {
        slippage: 0.03, // 3%
        allowSwitchChain: false,
      },
    };
    
    console.log(`[LI.FI Swap] Requesting route...`);
    const routeResponse = await getRoutes(routeRequest);
    
    if (!routeResponse.routes || routeResponse.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = routeResponse.routes[0];
    console.log(`[LI.FI Swap] Route found: ${route.steps.length} step(s)`);
    
    // Execute swap
    console.log(`[LI.FI Swap] Executing swap...`);
    let swapTxHash = null;
    let swapStatus = null;
    
    const executionOptions = {
      updateRouteHook: (updatedRoute) => {
        swapStatus = updatedRoute;
        if (updatedRoute.steps && updatedRoute.steps.length > 0) {
          const firstStep = updatedRoute.steps[0];
          if (firstStep.transactionHash && !swapTxHash) {
            swapTxHash = firstStep.transactionHash;
            console.log(`[LI.FI Swap] Transaction hash: ${swapTxHash}`);
          }
        }
      },
    };
    
    await executeRoute(route, executionOptions);
    
    if (swapStatus?.status === 'FAILED') {
      throw new Error(`Swap failed: ${swapStatus.substatus || 'Unknown error'}`);
    }
    
    // Get final transaction hash
    const finalTxHash = swapTxHash || swapStatus?.steps?.[0]?.transactionHash;
    
    if (!finalTxHash) {
      throw new Error('No transaction hash received');
    }
    
    // Return result as JSON
    const result = {
      success: true,
      txHash: finalTxHash,
      fromToken: fromTokenKey,
      toToken: toTokenKey,
      amount: amount.toString(),
      status: swapStatus?.status || 'COMPLETED',
    };
    
    console.log(JSON.stringify(result));
    return result;
    
  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      fromToken: fromTokenKey,
      toToken: toTokenKey,
      amount: amount.toString(),
    };
    console.error(JSON.stringify(errorResult));
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 5) {
  console.error('Usage: node lifi_swap.js <fromToken> <toToken> <amount> <privateKey> <recipient>');
  process.exit(1);
}

const [fromToken, toToken, amount, privateKey, recipient] = args;

swapTokens(fromToken, toToken, BigInt(amount), privateKey, recipient)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Swap failed:', error);
    process.exit(1);
  });
