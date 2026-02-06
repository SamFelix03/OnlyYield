import { createClient } from "@supabase/supabase-js";
import { createPublicClient, createWalletClient, decodeEventLog, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const CHAIN_ID = 8453;

function requireEnv(key) {
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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

const YIELD_ORCHESTRATOR_ABI = [
  {
    name: "harvestStrategy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "strategy", type: "address" }],
    outputs: [],
  },
];

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
];

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
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(publicClient, hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

function splitEqual(amount, recipients) {
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

async function runOnce() {
  const rpcUrl = getRpcUrl();
  const supabase = getSupabase();

  const operatorPk = requireEnv("OPERATOR_PRIVATE_KEY");
  const operator = privateKeyToAccount(operatorPk);
  const usdc = requireEnv("USDC_ADDRESS");
  const orchestrator = requireEnv("YIELD_ORCHESTRATOR_ADDRESS");
  const strategy = requireEnv("YIELD_STRATEGY_ADDRESS");

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account: operator, chain: base, transport: http(rpcUrl) });

  const decimals = await publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "decimals" });

  // 1) report/harvest
  console.log(`[worker] harvestStrategy(${strategy})...`);
  const harvestHash = await walletClient.writeContract({
    address: orchestrator,
    abi: YIELD_ORCHESTRATOR_ABI,
    functionName: "harvestStrategy",
    args: [strategy],
  });
  await waitFor(publicClient, harvestHash);
  console.log(`[worker] harvested: ${harvestHash}`);

  // 2) iterate non-withdrawn donations with their recipients
  const { data: donations, error: donationsErr } = await supabase
    .from("donations")
    .select("id, donor_wallet_address")
    .eq("withdrawn", false)
    .order("created_at", { ascending: true });
  if (donationsErr) throw new Error(donationsErr.message);

  if (!donations || donations.length === 0) {
    console.log(`[worker] no donations found`);
    return;
  }

  for (const donation of donations) {
    const donor = donation.donor_wallet_address;

    // Get recipients for this specific donation
    const { data: sel, error: selErr } = await supabase
      .from("donation_recipient_selections")
      .select("recipient_wallet_address")
      .eq("donation_id", donation.id);
    if (selErr) {
      console.log(`[worker] donation ${donation.id}: error fetching recipients: ${selErr.message}`);
      continue;
    }
    const recipients = (sel || []).map((x) => x.recipient_wallet_address);
    if (recipients.length === 0) {
      console.log(`[worker] donation ${donation.id}: no recipients selected; skipping`);
      continue;
    }

    // Optional: check if yield exists (view) to avoid revert
    const estYield = await publicClient.readContract({
      address: strategy,
      abi: YIELD_STRATEGY_ABI,
      functionName: "getUserYield",
      args: [donor],
    });
    if (BigInt(estYield) === BigInt(0)) {
      console.log(`[worker] donation ${donation.id}: getUserYield=0; skipping`);
      continue;
    }

    console.log(`[worker] donation ${donation.id} (donor ${donor}): claiming yield...`);
    let claimReceipt;
    try {
      const claimHash = await walletClient.writeContract({
        address: strategy,
        abi: YIELD_STRATEGY_ABI,
        functionName: "claimUserYield",
        args: [donor],
      });
      claimReceipt = await waitFor(publicClient, claimHash);
      console.log(`[worker] donation ${donation.id}: claim tx ${claimHash}`);
    } catch (e) {
      console.log(`[worker] donation ${donation.id}: claim failed: ${e?.shortMessage || e?.message || e}`);
      continue;
    }

    let claimed = 0n;
    for (const log of claimReceipt.logs) {
      if (log.address.toLowerCase() !== strategy.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({ abi: YIELD_STRATEGY_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === "UserYieldClaimed") {
          const args = decoded.args;
          if (args.user.toLowerCase() === donor.toLowerCase() && args.claimer.toLowerCase() === operator.address.toLowerCase()) {
            claimed = args.amount;
            break;
          }
        }
      } catch {}
    }
    if (claimed === 0n) {
      console.log(`[worker] donation ${donation.id}: could not parse claimed amount; skipping transfers`);
      continue;
    }

    // Safety: ensure operator has enough balance (in case of weird token behavior)
    await sleep(1500);
    const operatorBal = await publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [operator.address] });
    const actual = operatorBal < claimed ? operatorBal : claimed;
    if (actual === 0n) {
      console.log(`[worker] donation ${donation.id}: operator balance is 0 after claim; skipping`);
      continue;
    }

    const transfers = splitEqual(actual, recipients);
    for (const t of transfers) {
      if (t.amount === 0n) continue;
      const transferHash = await walletClient.writeContract({
        address: usdc,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [t.to, t.amount],
      });
      await waitFor(publicClient, transferHash);

      const amountHuman = formatUnits(t.amount, Number(decimals));
      const { error: insErr } = await supabase.from("yield_distributions").insert({
        chain_id: CHAIN_ID,
        donation_id: donation.id,
        donor_wallet_address: donor,
        recipient_wallet_address: t.to,
        claimed_tx_hash: claimReceipt.transactionHash,
        transfer_tx_hash: transferHash,
        amount_base_units: t.amount.toString(),
        amount: amountHuman,
      });
      if (insErr) console.log(`[worker] supabase insert failed: ${insErr.message}`);

      console.log(`[worker] donation ${donation.id} -> ${t.to}: ${amountHuman} USDC (tx ${transferHash})`);
    }
  }
}

async function main() {
  console.log("[worker] starting (every 2 minutes) ...");
  await runOnce().catch((e) => console.error("[worker] runOnce error:", e));
  setInterval(() => {
    runOnce().catch((e) => console.error("[worker] runOnce error:", e));
  }, 2 * 60 * 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});