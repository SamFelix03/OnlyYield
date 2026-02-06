import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const YIELD_VAULT_ABI = [
  { name: "aTokenBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "withdrawFromAave", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
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

export async function POST() {
  try {
    const rpcUrl = getRpcUrl();
    const vaultAddress = requireEnv("YIELD_VAULT_ADDRESS") as `0x${string}`;
    const operatorPk = requireEnv("OPERATOR_PRIVATE_KEY") as `0x${string}`;

    const operator = privateKeyToAccount(operatorPk);
    const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account: operator, chain: base, transport: http(rpcUrl) });

    const aBal = await publicClient.readContract({ address: vaultAddress, abi: YIELD_VAULT_ABI, functionName: "aTokenBalance" });
    if (aBal === BigInt(0)) return NextResponse.json({ ok: true, skipped: true, reason: "no aave funds", amount: "0" });

    const hash = await walletClient.writeContract({
      address: vaultAddress,
      abi: YIELD_VAULT_ABI,
      functionName: "withdrawFromAave",
      args: [aBal],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, tx_hash: hash, amount: aBal.toString() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.shortMessage || e?.message || String(e) }, { status: 500 });
  }
}

