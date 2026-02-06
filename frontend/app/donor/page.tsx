"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, createWalletClient, createPublicClient, http, custom, parseAbi, publicActions, encodeFunctionData } from "viem";
import { mainnet, polygon, arbitrum, optimism, base } from "viem/chains";
import { getConnectedWalletClient, getPublicClient } from "@/lib/web3/wallet";
import { getEthereumProvider } from "@/lib/web3/provider";
import { ERC20_ABI } from "@/lib/web3/abis";
import { YIELD_STRATEGY_ABI } from "@/lib/web3/strategy-abi";
import Aurora from "@/components/Aurora";
import { findDefaultToken } from '@lifi/data-types';
import { ChainId, CoinKey, createConfig, EVM, getRoutes, executeRoute, getTokenAllowance, setTokenAllowance, getStatus } from '@lifi/sdk';
import type { Address, Chain } from 'viem';

type Recipient = {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
  profile_pic_url?: string | null;
  social_links?: string[] | null;
};

const BASE_CHAIN_ID = 8453; // Base Mainnet

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "") as `0x${string}`;
const STRATEGY_ADDRESS = (process.env.NEXT_PUBLIC_YIELD_STRATEGY_ADDRESS || "") as `0x${string}`;

const CHAIN_CONFIG: Record<string, { chainId: ChainId; viemChain: Chain; name: string; rpcUrl: string }> = {
  ethereum: { 
    chainId: ChainId.ETH, 
    viemChain: mainnet, 
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com'
  },
  polygon: { 
    chainId: ChainId.POL, 
    viemChain: polygon, 
    name: 'Polygon',
    rpcUrl: 'https://polygon-mainnet.infura.io/v3/b4880ead6a9a4f77a6de39dec6f3d0d0'
  },
  arbitrum: { 
    chainId: ChainId.ARB, 
    viemChain: arbitrum, 
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
  },
  optimism: { 
    chainId: ChainId.OPT, 
    viemChain: optimism, 
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io'
  },
  base: {
    chainId: ChainId.BAS,
    viemChain: base,
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org'
  },
};

if (!USDC_ADDRESS) throw new Error("Missing NEXT_PUBLIC_USDC_ADDRESS");
if (!STRATEGY_ADDRESS) throw new Error("Missing NEXT_PUBLIC_YIELD_STRATEGY_ADDRESS");

export default function DonorPage() {
  const publicClient = useMemo(() => getPublicClient(), []);
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState<string>("");
  const [statusTxHash, setStatusTxHash] = useState<`0x${string}` | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [yieldEvents, setYieldEvents] = useState<any[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "donations">("deposit");
  const [depositView, setDepositView] = useState<"table" | "form">("table");
  
  // Chain selection state
  const [selectedSourceChain, setSelectedSourceChain] = useState<string | null>(null);
  const [chainBalances, setChainBalances] = useState<Record<string, { usdc: string; native: string }>>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Deposit process logging modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositLogs, setDepositLogs] = useState<string[]>([]);
  const [lifiExplorerLink, setLifiExplorerLink] = useState<string | null>(null);
  
  // Withdrawal process logging modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawLogs, setWithdrawLogs] = useState<string[]>([]);
  const [withdrawTxHashes, setWithdrawTxHashes] = useState<Array<{ label: string; hash: string; explorerUrl?: string }>>([]);
  const [withdrawLifiExplorerLink, setWithdrawLifiExplorerLink] = useState<string | null>(null);
  
  // Helper to add withdrawal log
  const addWithdrawLog = (message: string, updateStatus = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setWithdrawLogs(prev => [...prev, logMessage]);
    if (updateStatus) {
      setStatus(message);
    }
  };
  
  // Helper to add transaction hash
  const addWithdrawTxHash = (label: string, hash: string, explorerUrl?: string) => {
    setWithdrawTxHashes(prev => [...prev, { label, hash, explorerUrl }]);
    addWithdrawLog(`✅ ${label} transaction: ${hash}`, false);
    if (explorerUrl) {
      addWithdrawLog(`   🔗 Explorer: ${explorerUrl}`, false);
    }
  };
  
  // Helper to add log and update status
  const addLog = (message: string, updateStatus = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDepositLogs(prev => [...prev, logMessage]);
    if (updateStatus) {
      setStatus(message);
    }
  };

  async function connect() {
    setStatus("");
    setStatusTxHash(null);
    const wc = await getConnectedWalletClient();
    setWallet(wc.account!.address);
    // Load balances for all chains after connecting
    if (wc.account?.address) {
      loadChainBalances(wc.account.address);
    }
  }

  async function loadChainBalances(address: `0x${string}`) {
    setIsLoadingBalances(true);
    const balances: Record<string, { usdc: string; native: string }> = {};
    
    try {
      await Promise.all(
        Object.entries(CHAIN_CONFIG).map(async ([key, config]) => {
          try {
            const client = createPublicClient({
              chain: config.viemChain,
              transport: http(config.rpcUrl),
            });
            
            const sourceUsdc = findDefaultToken(CoinKey.USDC, config.chainId);
            if (!sourceUsdc) {
              console.warn(`USDC not found for ${config.name}`);
              balances[key] = { usdc: "0", native: "0" };
              return; // Continue to next chain
            }

            console.log(`Loading balances for ${config.name} (${key}):`, {
              chainId: config.chainId,
              usdcAddress: sourceUsdc.address,
              walletAddress: address,
            });

            const [usdcBalance, nativeBalance, decimals] = await Promise.all([
              client.readContract({
                address: sourceUsdc.address as Address,
                abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
                functionName: 'balanceOf',
                args: [address],
              }),
              client.getBalance({ address }),
              client.readContract({
                address: sourceUsdc.address as Address,
                abi: parseAbi(['function decimals() view returns (uint8)']),
                functionName: 'decimals',
              }),
            ]);

            const usdcFormatted = formatUnits(usdcBalance, decimals);
            const nativeFormatted = formatUnits(nativeBalance, 18);

            console.log(`Balances for ${config.name}:`, {
              usdc: usdcFormatted,
              native: nativeFormatted,
            });

            balances[key] = {
              usdc: usdcFormatted,
              native: nativeFormatted,
            };
          } catch (e) {
            console.error(`Failed to load balance for ${config.name}:`, e);
            balances[key] = { usdc: "0", native: "0" };
          }
        })
      );
      console.log('Final balances object:', balances);
      setChainBalances(balances);
    } catch (e) {
      console.error('Failed to load chain balances:', e);
    } finally {
      setIsLoadingBalances(false);
    }
  }

  async function refreshRecipients() {
    const r = await fetch("/api/recipients");
    const j = await r.json();
    setRecipients(j.recipients || []);
  }

  async function refreshHistory(addr: string) {
    const [d, y] = await Promise.all([
      fetch(`/api/donations?donor=${addr}`).then((r) => r.json()),
      fetch(`/api/yield-distributions?donor=${addr}`).then((r) => r.json()),
    ]);
    setDonations(d.donations || []);
    setYieldEvents(y.yield_distributions || []);
  }

  useEffect(() => {
    refreshRecipients().catch(console.error);
  }, []);

  useEffect(() => {
    if (!wallet) return;
    refreshHistory(wallet).catch(console.error);
  }, [wallet]);

  const selectedRecipientAddresses = useMemo(() => {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k as `0x${string}`);
  }, [selected]);

  async function deposit() {
    try {
      if (!wallet) throw new Error("Connect wallet");
      if (selectedRecipientAddresses.length === 0) throw new Error("Select at least one recipient for this deposit");
      if (!selectedSourceChain) throw new Error("Select a source chain");
      
      // Initialize deposit modal and logs
      setShowDepositModal(true);
      setDepositLogs([]);
      setLifiExplorerLink(null);
      setStatusTxHash(null);
      
      const sourceChainConfig = CHAIN_CONFIG[selectedSourceChain];
      if (!sourceChainConfig) throw new Error("Invalid source chain");

      addLog(`🚀 Starting deposit process...`);
      addLog(`📋 Configuration:`);
      addLog(`   Wallet: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`);
      addLog(`   Source Chain: ${sourceChainConfig.name} (Chain ID: ${sourceChainConfig.chainId})`);
      addLog(`   Amount: ${amount} USDC`);
      addLog(`   Recipients: ${selectedRecipientAddresses.length}`);
      selectedRecipientAddresses.forEach((addr, idx) => {
        addLog(`     ${idx + 1}. ${addr.slice(0, 6)}...${addr.slice(-4)}`, false);
      });

      addLog(`\n[1/6] Getting bridge + deposit quote from API...`);

      // Get source chain USDC address and decimals
      addLog(`   Looking up USDC token on ${sourceChainConfig.name}...`);
      const sourceUsdc = findDefaultToken(CoinKey.USDC, sourceChainConfig.chainId);
      if (!sourceUsdc) throw new Error(`USDC not found on ${sourceChainConfig.name}`);
      addLog(`   ✅ USDC found: ${sourceUsdc.address}`);

      addLog(`   Creating public client for ${sourceChainConfig.name}...`);
      const sourceClient = createPublicClient({
        chain: sourceChainConfig.viemChain,
        transport: http(sourceChainConfig.rpcUrl),
      });

      addLog(`   Reading USDC decimals...`);
      const decimals = await sourceClient.readContract({
        address: sourceUsdc.address as Address,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
      });
      addLog(`   ✅ USDC decimals: ${decimals}`);

      const amountInBaseUnits = parseUnits(amount || "0", decimals);
      addLog(`   Amount in base units: ${amountInBaseUnits.toString()}`);

      // Get quote from API
      addLog(`   Calling /api/bridge-deposit endpoint...`);
      addLog(`   Request: ${JSON.stringify({
        donor_wallet_address: wallet.slice(0, 10) + '...',
        source_chain: selectedSourceChain,
        amount_in_base_units: amountInBaseUnits.toString(),
        amount_in: amount,
        recipient_count: selectedRecipientAddresses.length,
      }, null, 2)}`, false);
      
      const res = await fetch("/api/bridge-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          donor_wallet_address: wallet,
          source_chain: selectedSourceChain,
          amount_in_base_units: amountInBaseUnits.toString(),
          amount_in: amount,
          recipient_wallet_addresses: selectedRecipientAddresses,
        }),
      });
      
      addLog(`   Response status: ${res.status} ${res.statusText}`);
      const quoteData = await res.json();
      if (!res.ok) {
        addLog(`   ❌ Error: ${quoteData.error || "Failed to get quote"}`);
        throw new Error(quoteData.error || "Failed to get quote");
      }
      
      addLog(`   ✅ Quote received successfully`);
      addLog(`   Quote details:`, false);
      addLog(`     Tool: ${quoteData.quote?.tool || 'N/A'}`, false);
      addLog(`     From Chain: ${quoteData.quote?.action?.fromChainId || 'N/A'}`, false);
      addLog(`     To Chain: ${quoteData.quote?.action?.toChainId || 'N/A'}`, false);
      addLog(`     From Amount: ${quoteData.quote?.action?.fromAmount || 'N/A'}`, false);
      addLog(`     To Amount: ${quoteData.quote?.action?.toAmount || 'N/A'}`, false);
      addLog(`     Steps: ${quoteData.quote?.includedSteps?.length || 0}`, false);

      addLog(`\n[2/6] Setting up LI.FI SDK...`);

      // Switch to source chain for the transaction
      addLog(`   Checking wallet provider...`);
      const provider = (window as any).ethereum;
      if (provider) {
        addLog(`   ✅ Wallet provider found`);
        try {
          addLog(`   Requesting chain switch to ${sourceChainConfig.name}...`);
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${sourceChainConfig.viemChain.id.toString(16)}` }],
          });
          addLog(`   ✅ Switched to ${sourceChainConfig.name}`);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            addLog(`   Chain not found, adding ${sourceChainConfig.name} to wallet...`);
            // Add chain if not present
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${sourceChainConfig.viemChain.id.toString(16)}`,
                chainName: sourceChainConfig.name,
                nativeCurrency: {
                  name: sourceChainConfig.viemChain.nativeCurrency.name,
                  symbol: sourceChainConfig.viemChain.nativeCurrency.symbol,
                  decimals: sourceChainConfig.viemChain.nativeCurrency.decimals,
                },
                rpcUrls: [sourceChainConfig.rpcUrl],
                blockExplorerUrls: sourceChainConfig.viemChain.blockExplorers?.default?.url ? [sourceChainConfig.viemChain.blockExplorers.default.url] : [],
              }],
            });
            addLog(`   ✅ Added ${sourceChainConfig.name} to wallet`);
          } else {
            addLog(`   ⚠️  Chain switch error: ${switchError.message}`);
          }
        }
      } else {
        addLog(`   ⚠️  No wallet provider found, using HTTP transport`);
      }

      // Setup LI.FI SDK with wallet provider
      addLog(`   Creating wallet client...`);
      const switchChains = [mainnet, arbitrum, optimism, polygon, base];
      const client = createWalletClient({
        account: wallet as Address,
        chain: sourceChainConfig.viemChain,
        transport: provider ? custom(provider) : http(sourceChainConfig.rpcUrl),
      }).extend(publicActions);
      addLog(`   ✅ Wallet client created`);

      addLog(`   Configuring LI.FI SDK...`);
      createConfig({
        integrator: 'creator-support',
        providers: [
          EVM({
            getWalletClient: () => Promise.resolve(client),
            switchChain: (chainId: number) =>
              Promise.resolve(
                createWalletClient({
                  account: wallet as Address,
                  chain: switchChains.find(
                    (chain) => chain.id === chainId
                  ) as Chain,
                  transport: http(),
                })
              ),
          }),
        ],
      });
      addLog(`   ✅ LI.FI SDK configured`);

      const quoteResponse = quoteData.quote;

      addLog(`\n[3/6] Checking token allowance...`);
      const AddressZero = '0x0000000000000000000000000000000000000000';
      if (quoteResponse.action.fromToken.address !== AddressZero) {
        addLog(`   Token: ${quoteResponse.action.fromToken.symbol} (${quoteResponse.action.fromToken.address})`);
        addLog(`   Approval address: ${quoteResponse.estimate.approvalAddress}`);
        addLog(`   Required amount: ${quoteResponse.action.fromAmount}`);
        
        const approval = await getTokenAllowance(
          quoteResponse.action.fromToken,
          wallet,
          quoteResponse.estimate.approvalAddress as Address
        );
        addLog(`   Current allowance: ${approval?.toString() || '0'}`);

        if (approval !== undefined && approval < BigInt(quoteResponse.action.fromAmount)) {
          addLog(`   ⚠️  Insufficient allowance, requesting approval...`);
          const txHash = await setTokenAllowance({
            walletClient: client,
            spenderAddress: quoteResponse.estimate.approvalAddress,
            token: quoteResponse.action.fromToken,
            amount: BigInt(quoteResponse.action.fromAmount),
          });
          addLog(`   ✅ Approval transaction sent: ${txHash}`);

          if (txHash) {
            addLog(`   Waiting for approval confirmation...`);
            await client.waitForTransactionReceipt({
              hash: txHash,
              retryCount: 20,
              retryDelay: ({ count }: { count: number; error: Error }) =>
                Math.min(~~(1 << count) * 200, 3000),
            });
            addLog(`   ✅ Approval confirmed`);
          }
        } else {
          addLog(`   ✅ Sufficient allowance`);
        }
      } else {
        addLog(`   ✅ Native token, no approval needed`);
      }

      addLog(`\n[4/6] Executing bridge + deposit transaction...`);
      addLog(`   Transaction details:`, false);
      addLog(`     To: ${quoteResponse.transactionRequest?.to}`, false);
      addLog(`     Value: ${quoteResponse.transactionRequest?.value || '0'}`, false);
      addLog(`     Gas Limit: ${quoteResponse.transactionRequest?.gasLimit || 'auto'}`, false);
      addLog(`     Data length: ${quoteResponse.transactionRequest?.data?.length || 0} bytes`, false);
      
      const transformTxRequest = (txRequest: any) => ({
        to: txRequest.to as Address,
        account: wallet as Address,
        data: txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit as string) : undefined,
        chain: null,
      });

      addLog(`   Sending transaction to wallet...`);
      const hash = await client.sendTransaction(transformTxRequest(quoteResponse.transactionRequest));
      setStatusTxHash(hash);
      addLog(`   ✅ Transaction sent: ${hash}`);
      addLog(`   Waiting for confirmation...`);

      const receipt = await client.waitForTransactionReceipt({ hash });
      addLog(`   ✅ Transaction confirmed`);
      addLog(`   Block: ${receipt.blockNumber}`);
      addLog(`   Gas used: ${receipt.gasUsed.toString()}`);

      addLog(`\n[5/6] Monitoring bridge execution status...`);
      // Wait for execution (cross-chain or same-chain)
      let finalTxHash = receipt.transactionHash;
      let lifiExplorerUrl: string | null = null;
      
      // Always check status with LI.FI (works for both cross-chain and same-chain)
      let result: any;
      let statusCheckCount = 0;
      do {
        statusCheckCount++;
        addLog(`   Status check #${statusCheckCount}...`);
        await new Promise((res) => setTimeout(() => res(null), 5000));
        result = await getStatus({
          txHash: receipt.transactionHash,
          bridge: quoteResponse.tool,
          fromChain: quoteResponse.action.fromChainId,
          toChain: quoteResponse.action.toChainId,
        });
        
        addLog(`   Status: ${result.status}${result.substatus ? ` (${result.substatus})` : ''}`);
        if (result.substatusMessage) {
          addLog(`   Message: ${result.substatusMessage}`, false);
        }
        
        // Extract transaction hash from result if available
        if (result.status === 'DONE' && result.receiving?.txHash) {
          finalTxHash = result.receiving.txHash;
          addLog(`   ✅ Destination transaction: ${finalTxHash}`);
        }
        
        // Extract explorer URL if available
        if (result.receiving?.txLink) {
          lifiExplorerUrl = result.receiving.txLink;
          addLog(`   🔗 Found receiving txLink: ${lifiExplorerUrl}`, false);
        } else if (result.sending?.txLink) {
          lifiExplorerUrl = result.sending.txLink;
          addLog(`   🔗 Found sending txLink: ${lifiExplorerUrl}`, false);
        }
        
        // Also check for LI.FI explorer link - THIS IS THE KEY ONE!
        if (result.lifiExplorerLink) {
          lifiExplorerUrl = result.lifiExplorerLink;
          addLog(`   🔗✅ LI.FI EXPLORER LINK: ${lifiExplorerLink}`, false);
          setLifiExplorerLink(lifiExplorerLink);
        }
        
        // Log fee costs if available
        if (result.feeCosts && result.feeCosts.length > 0) {
          addLog(`   Fee costs:`, false);
          result.feeCosts.forEach((fee: any, idx: number) => {
            addLog(`     ${idx + 1}. ${fee.name}: ${fee.amount} ${fee.token?.symbol || ''} (${fee.amountUSD || 'N/A'} USD)`, false);
          });
        }
      } while (result.status !== 'DONE' && result.status !== 'FAILED');

      if (result.status === 'FAILED') {
        addLog(`   ❌ Execution failed: ${result.substatus || 'Unknown error'}`);
        throw new Error(`Execution failed: ${result.substatus || 'Unknown error'}`);
      }
      
      addLog(`   ✅ Bridge execution completed successfully!`);

      addLog(`\n[6/6] Saving donation record...`);
      // Extract just the hash from URL if it's a URL, otherwise use the hash directly
      // Helper function to extract hash from URL or return hash if already a hash
      const extractHash = (input: string | null): string => {
        if (!input) return finalTxHash;
        // If it's already just a hash (starts with 0x and is 66 chars), return it
        if (input.startsWith('0x') && input.length === 66) return input;
        // If it's a URL, extract the hash from the end
        const match = input.match(/0x[a-fA-F0-9]{64}/);
        return match ? match[0] : finalTxHash;
      };

      // Store only the hash in the database
      const depositTxHash = extractHash(lifiExplorerUrl || finalTxHash);
      addLog(`   Final transaction hash: ${depositTxHash}`);
      if (lifiExplorerLink) {
        addLog(`   🔗 LI.FI Explorer: ${lifiExplorerLink}`);
      }

      addLog(`   Calling /api/donations endpoint...`);
      const saveRes = await fetch("/api/donations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          donor_wallet_address: wallet,
          input_asset_address: sourceUsdc.address,
          target_asset_address: USDC_ADDRESS,
          amount_in: amount,
          amount_in_base_units: amountInBaseUnits.toString(),
          chain_id: sourceChainConfig.chainId,
          deposit_tx_hash: depositTxHash,
          recipient_wallet_addresses: selectedRecipientAddresses,
        }),
      });
      
      addLog(`   Response status: ${saveRes.status} ${saveRes.statusText}`);
      if (!saveRes.ok) {
        const saveError = await saveRes.json();
        addLog(`   ❌ Error saving donation: ${saveError.error || 'Unknown error'}`);
        throw new Error(saveError.error || "Failed to save donation");
      }
      
      const saveData = await saveRes.json();
      addLog(`   ✅ Donation saved successfully!`);
      addLog(`   Donation ID: ${saveData.donation_id || 'N/A'}`, false);
      
      addLog(`\n🎉 Deposit process completed successfully!`);
      if (lifiExplorerLink) {
        addLog(`🔗 Track your transaction: ${lifiExplorerLink}`);
      }
      
      setStatus(`✅ Deposit complete!`);
      setSelected({});
      setSelectedSourceChain(null);
      await refreshHistory(wallet);
      await loadChainBalances(wallet);
    } catch (error: any) {
      addLog(`\n❌ ERROR: ${error?.message || String(error)}`);
      setStatus(`❌ Error: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async function withdrawDonation(donationId: string, amountBaseUnits: string) {
    if (!wallet) throw new Error("Connect wallet");
    setIsWithdrawing((prev) => ({ ...prev, [donationId]: true }));
    
    // Reset withdrawal state
    setWithdrawLogs([]);
    setWithdrawTxHashes([]);
    setWithdrawLifiExplorerLink(null);
    setShowWithdrawModal(true);
    setStatusTxHash(null);
    
    const amount = BigInt(amountBaseUnits);
    const amountDisplay = formatUnits(amount, 6);
    
    addWithdrawLog(`[1/5] Starting withdrawal process...`);
    addWithdrawLog(`   Donation ID: ${donationId}`, false);
    addWithdrawLog(`   Amount: ${amountDisplay} USDC (${amount} base units)`, false);
    addWithdrawLog(`   Donor: ${wallet}`, false);

    try {
      // Step 1: Request withdrawal (operator executes withdrawERC20)
      addWithdrawLog(`\n[2/5] Requesting withdrawal from API (operator will execute)...`);
      const quoteRes = await fetch("/api/orchestrate/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          donation_id: donationId,
          donor_wallet_address: wallet,
          amount_in_base_units: amountBaseUnits,
        }),
      });

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        // Check if approval is needed
        if (quoteData.needs_approval) {
          addWithdrawLog(`   ⚠️  Approval required for orchestrator`);
          addWithdrawLog(`   Current allowance: ${formatUnits(BigInt(quoteData.current_allowance || '0'), 18)} shares`, false);
          addWithdrawLog(`   Required: ${formatUnits(BigInt(quoteData.required_shares || '0'), 18)} shares`, false);
          
          // Request approval from donor
          addWithdrawLog(`\n[2a/5] Requesting approval from donor...`);
          const wc = await getConnectedWalletClient();
          
          // Approve max uint256 to avoid needing approval again
          const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'); // 2^256 - 1
          const approvalHash = await wc.writeContract({
            address: quoteData.strategy_address,
            abi: YIELD_STRATEGY_ABI,
            functionName: 'approve',
            args: [
              quoteData.orchestrator_address,
              MAX_UINT256,
            ],
          });
          
          addWithdrawTxHash("Approval", approvalHash, `https://basescan.org/tx/${approvalHash}`);
          addWithdrawLog(`   Waiting for approval confirmation...`);
          
          const approvalReceipt = await Promise.race([
            publicClient.waitForTransactionReceipt({ hash: approvalHash }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Approval confirmation timeout after 5 minutes')), 5 * 60 * 1000)
            )
          ]) as any;
          
          addWithdrawLog(`   ✅ Approval confirmed in block ${approvalReceipt.blockNumber}`);
          
          // Retry withdrawal after approval
          addWithdrawLog(`\n[2b/5] Retrying withdrawal after approval...`);
          const retryRes = await fetch("/api/orchestrate/withdraw", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              donation_id: donationId,
              donor_wallet_address: wallet,
              amount_in_base_units: amountBaseUnits,
            }),
          });
          
          const retryData = await retryRes.json();
          if (!retryRes.ok) {
            throw new Error(retryData.error || "Failed to get withdrawal quote after approval");
          }
          
          // Use the retry data as quoteData
          Object.assign(quoteData, retryData);
        } else {
          throw new Error(quoteData.error || "Failed to get withdrawal quote");
        }
      }

      addWithdrawLog(`   ✅ Withdrawal request processed`);
      addWithdrawLog(`   Same chain: ${quoteData.same_chain ? 'Yes' : 'No'}`, false);
      if (quoteData.withdraw_tx_hash) {
        addWithdrawTxHash("Withdrawal (Operator)", quoteData.withdraw_tx_hash, `https://basescan.org/tx/${quoteData.withdraw_tx_hash}`);
        addWithdrawLog(`   ✅ Withdrawal executed by operator`, false);
      }

      let finalTxHash: `0x${string}` = quoteData.withdraw_tx_hash || '0x';

      if (quoteData.same_chain) {
        // Same chain withdrawal - already completed by operator
        addWithdrawLog(`\n[3/5] ✅ Withdrawal completed!`);
        addWithdrawLog(`   Funds are in your account on Base`, false);
        finalTxHash = quoteData.withdraw_tx_hash;
      } else {
        // Cross-chain withdrawal: Bridge from Base to original chain
        addWithdrawLog(`\n[3/5] Bridging funds from Base to ${quoteData.destination_chain}...`);
        addWithdrawLog(`   Withdrawal completed - funds are in your account on Base`, false);
        addWithdrawLog(`   Now bridging to ${quoteData.destination_chain}...`, false);
        
        // Setup LI.FI SDK for bridging
        const provider = getEthereumProvider();
        const switchChains = [mainnet, arbitrum, optimism, polygon, base];
        const baseChainConfig = CHAIN_CONFIG.base;
        const wc = await getConnectedWalletClient();
        const client = createWalletClient({
          account: wallet as Address,
          chain: baseChainConfig.viemChain,
          transport: provider ? custom(provider) : http(baseChainConfig.rpcUrl),
        }).extend(publicActions);
        
        createConfig({
          integrator: 'creator-support',
          providers: [
            EVM({
              getWalletClient: () => Promise.resolve(client),
              switchChain: (chainId: number) =>
                Promise.resolve(
                  createWalletClient({
                    account: wallet as Address,
                    chain: switchChains.find(
                      (chain) => chain.id === chainId
                    ) as Chain,
                    transport: http(),
                  })
                ),
            }),
          ],
        });
        addWithdrawLog(`   ✅ LI.FI SDK configured`);

        const routeRequest = {
          toAddress: wallet as Address,
          fromAddress: wallet as Address,
          fromChainId: ChainId.BAS,
          fromAmount: quoteData.amount_in_base_units,
          fromTokenAddress: quoteData.source_usdc_address,
          toChainId: quoteData.destination_chain_id,
          toTokenAddress: quoteData.destination_usdc_address,
          options: {
            slippage: 0.03, // 3%
          },
        };

        addWithdrawLog(`   Requesting bridge route...`);
        const routeResponse = await getRoutes(routeRequest);
        if (!routeResponse.routes || routeResponse.routes.length === 0) {
          throw new Error(`No bridge route found to ${quoteData.destination_chain}`);
        }

        const route = routeResponse.routes[0];
        addWithdrawLog(`   ✅ Route found: ${route.steps.length} step(s)`, false);

        // Execute bridge
        addWithdrawLog(`   Executing bridge transaction...`);
        
        let bridgeTxHash = '';
        let bridgeStatus: any;
        const executionOptions = {
          updateRouteHook: (updatedRoute: any) => {
            bridgeStatus = updatedRoute;
            if (updatedRoute.steps && updatedRoute.steps.length > 0) {
              const firstStep = updatedRoute.steps[0];
              if (firstStep.transactionHash && !bridgeTxHash) {
                bridgeTxHash = firstStep.transactionHash;
                addWithdrawTxHash("Bridge", bridgeTxHash, firstStep.txLink);
                addWithdrawLog(`   ✅ Bridge transaction sent: ${bridgeTxHash}`, false);
              }
            }
            if (updatedRoute.status) {
              addWithdrawLog(`   Bridge status: ${updatedRoute.status}${updatedRoute.substatus ? ` (${updatedRoute.substatus})` : ''}`, false);
            }
          },
        };

        await executeRoute(route, executionOptions);
        
        if (bridgeStatus?.status === 'FAILED') {
          throw new Error(`Bridge execution failed: ${bridgeStatus.substatus || 'Unknown error'}`);
        }

        if (bridgeStatus?.receiving?.txHash) {
          finalTxHash = bridgeStatus.receiving.txHash;
          addWithdrawTxHash("Bridge Receiving", finalTxHash, bridgeStatus.receiving.txLink);
        }

        if (bridgeStatus?.lifiExplorerLink) {
          setWithdrawLifiExplorerLink(bridgeStatus.lifiExplorerLink);
          addWithdrawLog(`   🔗✅ LI.FI EXPLORER: ${bridgeStatus.lifiExplorerLink}`, false);
        }

        addWithdrawLog(`   ✅ Bridge execution completed successfully!`);
      }

      // Step 4: Mark donation as withdrawn in database (ONLY after full success)
      addWithdrawLog(`\n[4/5] Marking donation as withdrawn in database...`);
      const markRes = await fetch("/api/donations/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          donation_id: donationId,
          withdraw_tx_hash: finalTxHash,
        }),
      });
      const markData = await markRes.json();
      if (!markRes.ok) {
        addWithdrawLog(`   ❌ Failed to mark as withdrawn: ${markData.error}`);
        throw new Error(`Failed to mark donation as withdrawn: ${markData.error}`);
      }
      addWithdrawLog(`   ✅ Donation marked as withdrawn in database`);

      // Step 5: Complete
      addWithdrawLog(`\n[5/5] ✅ Withdrawal completed successfully!`);
      addWithdrawLog(`   Final transaction: ${finalTxHash}`, false);
      setStatusTxHash(finalTxHash);
      setStatus(`✅ Withdrawn ${amountDisplay} USDC${quoteData.same_chain ? '' : ' and bridged to original chain'}.`);
      await refreshHistory(wallet);
    } catch (error: any) {
      addWithdrawLog(`\n❌ ERROR: Withdrawal failed`);
      addWithdrawLog(`   ${error?.shortMessage || error?.message || String(error)}`, false);
      console.error(`[withdraw] Error:`, error);
      const errorMsg = error?.shortMessage || error?.message || String(error);
      setStatus(`❌ Withdrawal failed: ${errorMsg}`);
      throw error;
    } finally {
      setIsWithdrawing((prev) => ({ ...prev, [donationId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Deposit Process Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/95 via-black/95 to-slate-900/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-slate-50">Deposit Process Logs</h2>
              <button
                onClick={() => setShowDepositModal(false)}
                className="rounded-full p-2 hover:bg-white/10 transition text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {lifiExplorerLink && (
              <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">🔗 LI.FI Explorer:</span>
                  <a
                    href={lifiExplorerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 hover:text-blue-200 underline break-all"
                  >
                    {lifiExplorerLink}
                  </a>
                </div>
              </div>
            )}
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="font-mono text-xs sm:text-sm space-y-1">
                {depositLogs.length === 0 ? (
                  <div className="text-slate-400">Waiting for logs...</div>
                ) : (
                  depositLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('❌') || log.includes('Error') ? 'text-red-400' :
                        log.includes('⚠️') ? 'text-yellow-400' :
                        log.includes('🔗') ? 'text-blue-400' :
                        log.includes('🚀') || log.includes('🎉') ? 'text-purple-400' :
                        'text-slate-300'
                      } break-words`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {depositLogs.length} log{depositLogs.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={() => {
                  setDepositLogs([]);
                  setLifiExplorerLink(null);
                }}
                className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Process Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/95 via-black/95 to-slate-900/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-slate-50">Withdrawal Process Logs</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="rounded-full p-2 hover:bg-white/10 transition text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {withdrawLifiExplorerLink && (
              <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-semibold">🔗 LI.FI Explorer:</span>
                  <a
                    href={withdrawLifiExplorerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 hover:text-blue-200 underline break-all"
                  >
                    {withdrawLifiExplorerLink}
                  </a>
                </div>
              </div>
            )}

            {withdrawTxHashes.length > 0 && (
              <div className="p-4 bg-green-500/10 border-b border-green-500/20">
                <div className="text-green-400 font-semibold mb-2">Transaction Hashes:</div>
                <div className="space-y-2">
                  {withdrawTxHashes.map((tx, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-green-300 text-sm font-medium min-w-[120px]">{tx.label}:</span>
                      <div className="flex-1">
                        <a
                          href={tx.explorerUrl || `https://basescan.org/tx/${tx.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-300 hover:text-green-200 underline break-all text-sm"
                        >
                          {tx.hash}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
              <div className="font-mono text-xs sm:text-sm space-y-1">
                {withdrawLogs.length === 0 ? (
                  <div className="text-slate-400">Waiting for logs...</div>
                ) : (
                  withdrawLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('❌') || log.includes('ERROR') || log.includes('Error') ? 'text-red-400' :
                        log.includes('⚠️') ? 'text-yellow-400' :
                        log.includes('🔗') ? 'text-blue-400' :
                        log.includes('🚀') || log.includes('🎉') ? 'text-purple-400' :
                        'text-slate-300'
                      } break-words`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {withdrawLogs.length} log{withdrawLogs.length !== 1 ? 's' : ''} • {withdrawTxHashes.length} transaction{withdrawTxHashes.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={() => {
                  setWithdrawLogs([]);
                  setWithdrawTxHashes([]);
                  setWithdrawLifiExplorerLink(null);
                }}
                className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Aurora background reused from landing page */}
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={["#475569", "#64748b", "#475569"]}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 text-white">
        {/* Header row with title/description on left, wallet on right */}
        <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Support Your Favorite Creators</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-lg shadow-lg border border-white/20 hover:bg-white/20 transition"
            onClick={() => connect().catch((e) => setStatus(String(e)))}
          >
            {wallet ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>
        </div>

        {status ? (
          <div className="relative z-10 mt-6 rounded-2xl border border-slate-400/40 bg-black/70 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur-md">
            <div>{status}</div>
            {statusTxHash ? (
              <a
                href={`https://basescan.org/tx/${statusTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all text-[11px] text-slate-300 hover:text-white hover:underline"
              >
                {statusTxHash}
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Quick stats row */}
        <div className="relative z-10 mt-6 grid gap-4 text-xs sm:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Creators
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{recipients.length}</div>
          <p className="mt-1 text-[11px] text-slate-400">Eligible recipients you can support.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Deposits
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{donations.length}</div>
          <p className="mt-1 text-[11px] text-slate-400">Active and historical positions.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/70 px-4 py-3 shadow-md backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Yield events
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">{yieldEvents.length}</div>
          <p className="mt-1 text-[11px] text-slate-400">Times creators earned from your deposits.</p>
        </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 mt-8 inline-flex self-center rounded-full border border-white/10 bg-black/60 p-1 text-sm shadow-lg backdrop-blur-xl">
        {[
          { id: "deposit", label: "Deposit" },
          { id: "withdraw", label: "Withdraw" },
          { id: "donations", label: "Donations" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-5 py-2 rounded-full transition text-xs sm:text-sm ${
              activeTab === tab.id
                ? "bg-white text-black shadow-md"
                : "text-zinc-200 hover:bg-white/10"
            }`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
        </div>

        {/* Tab content */}
        <div className="relative z-10 mt-8 flex-1 space-y-8">
        {activeTab === "deposit" && (
          <>
            {depositView === "table" && (
              <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="text-[11px] font-semibold tracking-[0.22em] text-slate-200 uppercase">
                      Creators
                    </span>
                  </div>
                  <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                    {recipients.length} Creators
                  </div>
                </div>

                <button
                  className="mt-4 inline-flex items-center rounded-full bg-white/90 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.03] hover:bg-white"
                  onClick={() => setDepositView("form")}
                >
                  Donate Now &rarr;
                </button>

                <div className="mt-4 space-y-2">
                  {recipients.map((r: Recipient, index: number) => {
                    const isSelected = !!selected[r.wallet_address];
                    const rankColor =
                      index === 0
                        ? "bg-slate-100 text-black"
                        : index === 1
                        ? "bg-slate-400 text-black"
                        : index === 2
                        ? "bg-slate-600 text-white"
                        : "bg-slate-800 text-white";

                    return (
                      <button
                        key={r.wallet_address}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-left text-xs sm:text-sm hover:border-slate-300/60 hover:bg-black/80 transition"
                        onClick={() =>
                          setSelected((prev) => ({
                            ...prev,
                            [r.wallet_address]: !prev[r.wallet_address],
                          }))
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 text-[11px] font-bold text-slate-200">
                            {index + 1}
                          </div>
                          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/70">
                            {r.profile_pic_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.profile_pic_url}
                                alt={r.display_name || "Creator avatar"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className={`text-[11px] font-bold ${rankColor}`}>
                                {(r.display_name || "CR").slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-extrabold tracking-wide text-slate-50">
                              {r.display_name || "Creator"}
                            </span>
                            <span className="text-[11px] uppercase text-slate-400">
                              {r.wallet_address.slice(0, 6)}…{r.wallet_address.slice(-4)}
                            </span>
                          </div>
                          <span className="mt-0.5 text-[11px] text-slate-500">
                            Joined {new Date(r.created_at).toLocaleDateString()}
                          </span>
                          {r.social_links && r.social_links.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {r.social_links.slice(0, 3).map((link) => {
                                let host = "";
                                let handle = "";
                                try {
                                  const url = new URL(link);
                                  host = url.hostname.replace("www.", "");
                                  handle = url.pathname.replace(/\/+/g, "/").replace(/^\//, "");
                                } catch {
                                  host = "link";
                                  handle = link;
                                }
                                return (
                                  <a
                                    key={link}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex min-w-[140px] max-w-[200px] flex-col rounded-2xl border border-white/10 bg-black/60 px-3 py-2 text-[10px] text-slate-200 hover:border-white/40 hover:bg-black/80 transition"
                                  >
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {host}
                                    </span>
                                    <span className="mt-1 truncate text-[11px] group-hover:text-white">
                                      {handle || link}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div>
                          <span
                            className={`inline-flex min-w-[80px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${
                              isSelected
                                ? "bg-slate-100 text-black"
                                : "bg-slate-800 text-slate-100"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {recipients.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/70 px-4 py-6 text-center text-sm text-slate-300">
                      No recipients yet. Ask a creator to register.
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {depositView === "form" && (
              <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="inline-flex items-center rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-black/80 transition"
                    onClick={() => setDepositView("table")}
                    type="button"
                  >
                    ← Back to recipients
                  </button>
                </div>

                {/* Amount to deposit (top block) */}
                <div className="mt-8 flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-black/60 px-6 py-10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Amount to donate
                  </div>
                  <div className="relative">
                    <input
                      className="w-full bg-transparent text-center text-5xl sm:text-6xl font-semibold tracking-tight text-slate-50 outline-none placeholder:text-slate-600"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="mt-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      USDC
                    </div>
                  </div>
                  <p className="max-w-sm text-center text-[11px] leading-relaxed text-slate-400">
                    Your principal is always withdrawable. Creators only receive the yield generated on your deposit.
                  </p>
                </div>

                {/* Source Chain Selection */}
                <div className="mt-6 rounded-3xl border border-white/15 bg-black/60 px-6 py-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 mb-4">
                    Select Source Chain
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(CHAIN_CONFIG).map(([key, config]) => {
                      const balance = chainBalances[key];
                      const isSelected = selectedSourceChain === key;
                      const hasBalance = balance !== undefined;
                      // Map chain keys to logo filenames
                      const chainLogoMap: Record<string, string> = {
                        ethereum: 'ethereum.png',
                        polygon: 'polygon.png',
                        arbitrum: 'arbitrum.png',
                        optimism: 'optimism.png',
                        base: 'base.png',
                      };
                      const logoPath = `/chain-logo/${chainLogoMap[key] || 'circle.png'}`;
                      
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedSourceChain(key)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-white/60 bg-white/10"
                              : "border-white/10 bg-black/40 hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <img
                              src={logoPath}
                              alt={config.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <div className="text-xs font-semibold text-slate-50">{config.name}</div>
                          </div>
                          {isLoadingBalances ? (
                            <div className="text-[10px] text-slate-400">Loading...</div>
                          ) : hasBalance ? (
                            <div className="text-[10px] text-slate-300">
                              {parseFloat(balance.usdc || "0").toFixed(2)} USDC
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Connect Wallet</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedSourceChain && (
                    <div className="mt-4 text-xs text-slate-300">
                      Selected: <span className="font-semibold">{CHAIN_CONFIG[selectedSourceChain].name}</span>
                    </div>
                  )}
                </div>

                {/* Summary (below) */}
                <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-white/15 bg-black/60 px-5 py-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Summary
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Donation amount</span>
                      <span className="font-semibold text-slate-50">{amount || "0"} USDC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Recipients</span>
                      <span className="font-semibold text-slate-50">
                        {selectedRecipientAddresses.length || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-slate-300/40 transition hover:scale-[1.03] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!wallet || selectedRecipientAddresses.length === 0 || !selectedSourceChain}
                    onClick={() => deposit().catch((e) => setStatus(String(e)))}
                    type="button"
                  >
                    Bridge & Deposit
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === "withdraw" && (
          <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Withdraw principal</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-300">
                  Withdraw your original donation amounts. Each donation can be withdrawn separately and will appear here
                  once created.
                </p>
              </div>
              <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                {donations.length} Positions
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium text-slate-50">
                      {d.amount_in} USDC{" "}
                      {d.withdrawn ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-black">
                          Withdrawn
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-400 break-all">
                      deposit tx:{" "}
                      <a
                        href={`https://scan.li.fi/tx/${d.deposit_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-white hover:underline"
                        title="View on LI.FI Explorer"
                      >
                        {d.deposit_tx_hash.slice(0, 10)}...{d.deposit_tx_hash.slice(-8)}
                      </a>
                      {" "}
                      <a
                        href={`https://basescan.org/tx/${d.deposit_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 text-[10px]"
                        title="View on BaseScan"
                      >
                        (BaseScan)
                      </a>
                    </div>
                    {d.withdraw_tx_hash ? (
                      <div className="text-[11px] text-slate-400 break-all">
                        withdraw tx:{" "}
                        <a
                          href={`https://basescan.org/tx/${d.withdraw_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-300 hover:text-white hover:underline"
                        >
                          {d.withdraw_tx_hash}
                        </a>
                      </div>
                    ) : null}
                    <div className="text-[11px] text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="w-full rounded-full bg-slate-100 px-5 py-2 text-xs font-semibold text-black shadow-md shadow-slate-300/40 transition hover:bg-white sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-400/60"
                    disabled={!wallet || isWithdrawing[d.id] || d.withdrawn}
                    onClick={() => withdrawDonation(d.id, d.amount_in_base_units).catch((e) => setStatus(String(e)))}
                  >
                    {isWithdrawing[d.id] ? "Withdrawing..." : d.withdrawn ? "Withdrawn" : "Withdraw"}
                  </button>
                </div>
              ))}
              {donations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/20 bg-black/70 px-4 py-6 text-center text-sm text-slate-300">
                  No donations yet. Once you deposit, your positions will appear here for withdrawal.
                </div>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === "donations" && (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">Your donations</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300">
                    Donation history
                  </p>
                </div>
                <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-100">
                  {donations.length} <span className="uppercase">Donations</span>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {donations.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-3xl border border-white/10 bg-black/70 p-4 text-xs sm:text-sm"
                  >
                    <div className="font-medium text-slate-50">
                      {d.amount_in} USDC{" "}
                      {d.withdrawn ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-black">
                          Withdrawn
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 break-all text-[11px] text-slate-400">
                      deposit tx:{" "}
                      <a
                        href={`https://scan.li.fi/tx/${d.deposit_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-white hover:underline"
                        title="View on LI.FI Explorer"
                      >
                        {d.deposit_tx_hash.slice(0, 10)}...{d.deposit_tx_hash.slice(-8)}
                      </a>
                      {" "}
                      <a
                        href={`https://basescan.org/tx/${d.deposit_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 text-[10px]"
                        title="View on BaseScan"
                      >
                        (BaseScan)
                      </a>
                    </div>
                    {d.withdraw_tx_hash ? (
                      <div className="break-all text-[11px] text-slate-400">
                        withdraw tx:{" "}
                        <a
                          href={`https://basescan.org/tx/${d.withdraw_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-300 hover:text-white hover:underline"
                        >
                          {d.withdraw_tx_hash}
                        </a>
                      </div>
                    ) : null}
                    <div className="mt-1 text-[11px] text-slate-500">{d.created_at}</div>
                  </div>
                ))}
                {donations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/20 bg-black/70 px-4 py-6 text-center text-sm text-slate-300">
                    No donations yet.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-700/40 via-slate-900/80 to-black p-5 shadow-xl backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">Yield distributions attributed to you</h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300">
                  Creator yield claims
                  </p>
                </div>
                <div className="rounded-full border border-slate-300/40 bg-black/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-100">
                  {yieldEvents.length} <span className="uppercase">events</span>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {yieldEvents.map((y) => (
                  <div
                    key={y.id}
                    className="rounded-3xl border border-white/10 bg-black/70 p-4 text-xs sm:text-sm"
                  >
                    <div className="font-medium text-slate-50">
                      {y.amount} USDC{" "}
                      <span className="text-slate-200">
                        → {y.recipient_wallet_address.slice(0, 6)}…{y.recipient_wallet_address.slice(-4)}
                      </span>
                    </div>
                    <div className="mt-1 break-all text-[11px] text-slate-400">
                      claim tx:{" "}
                      <a
                        href={`https://basescan.org/tx/${y.claimed_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-white hover:underline"
                      >
                        {y.claimed_tx_hash}
                      </a>
                    </div>
                    <div className="break-all text-[11px] text-slate-400">
                      transfer tx:{" "}
                      <a
                        href={`https://basescan.org/tx/${y.transfer_tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-300 hover:text-white hover:underline"
                      >
                        {y.transfer_tx_hash}
                      </a>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">{y.created_at}</div>
                  </div>
                ))}
                {yieldEvents.length === 0 ? (
                  <div className="flex items-center justify-center rounded-2xl border border-white/12 bg-black/60 px-4 py-5 text-sm text-slate-300">
                    No yield distributions yet.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
