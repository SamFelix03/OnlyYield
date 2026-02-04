import { createPublicClient, createWalletClient, custom, http } from "viem";
import { base } from "viem/chains";
import { getEthereumProvider } from "./provider";

export function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    "https://mainnet.base.org"
  );
}

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(getRpcUrl()),
  });
}

async function switchToBase(provider: any): Promise<void> {
  const chainId = "0x2105"; // 8453 in hex
  const rpcUrl = getRpcUrl();

  try {
    // Try to switch to the chain
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        // Add the chain
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId,
              chainName: "Base",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: ["https://basescan.org"],
            },
          ],
        });
        // Try switching again after adding
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId }],
        });
      } catch (addError) {
        throw new Error("Failed to add Base network to wallet");
      }
    } else {
      throw switchError;
    }
  }
}

export async function getConnectedWalletClient() {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet found (window.ethereum)");
  
  // Request accounts first
  const [address] = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  
  // Switch to Base
  await switchToBase(provider);
  
  return createWalletClient({
    account: address as `0x${string}`,
    chain: base,
    transport: custom(provider),
  });
}

