import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { base } from "viem/chains";

const ERC20_DECIMALS_ABI = [
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

const YIELD_VAULT_ABI = [
  { name: "idleUnderlying", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "aTokenBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

function getRpcUrl() {
  return (
    process.env.BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    "https://mainnet.base.org"
  ).trim();
}

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v.trim();
}

export async function GET() {
  try {
    const rpcUrl = getRpcUrl();
    const vaultAddress = requireEnv("YIELD_VAULT_ADDRESS") as `0x${string}`;
    const usdcAddress = requireEnv("USDC_ADDRESS") as `0x${string}`;

    const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });

    const [decimals, idle, aave] = await Promise.all([
      publicClient.readContract({ address: usdcAddress, abi: ERC20_DECIMALS_ABI, functionName: "decimals" }),
      publicClient.readContract({ address: vaultAddress, abi: YIELD_VAULT_ABI, functionName: "idleUnderlying" }),
      publicClient.readContract({ address: vaultAddress, abi: YIELD_VAULT_ABI, functionName: "aTokenBalance" }),
    ]);

    return NextResponse.json({
      ok: true,
      chain_id: 8453,
      vault_address: vaultAddress,
      usdc_address: usdcAddress,
      decimals: Number(decimals),
      idle_underlying: idle.toString(),
      aave_underlying: aave.toString(),
      idle_formatted: formatUnits(idle, decimals),
      aave_formatted: formatUnits(aave, decimals),
      total_formatted: formatUnits(idle + aave, decimals),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

