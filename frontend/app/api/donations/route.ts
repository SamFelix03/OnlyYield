import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const donor = (url.searchParams.get("donor") || "").trim();
  const recipient = (url.searchParams.get("recipient") || "").trim();

  const supabase = getSupabase();
  let q = supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(100);
  if (donor) q = q.eq("donor_wallet_address", donor);
  if (recipient) q = q.eq("recipient_wallet_address", recipient as any); // not a column; ignore

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donations: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = (await req.json()) as {
    donor_wallet_address: string;
    input_asset_address: string;
    target_asset_address: string;
    amount_in: string;
    amount_in_base_units: string;
    chain_id: number;
    deposit_tx_hash: string;
    recipient_wallet_addresses?: string[];
  };

  const donor = (body.donor_wallet_address || "").trim();
  if (!donor) return NextResponse.json({ error: "donor_wallet_address required" }, { status: 400 });

  // Extract just the hash from deposit_tx_hash (in case a full URL was passed)
  const extractHash = (input: string): string => {
    if (!input) return input;
    // If it's already just a hash (starts with 0x and is 66 chars), return it
    if (input.startsWith('0x') && input.length === 66) return input;
    // If it's a URL, extract the hash from it
    const match = input.match(/0x[a-fA-F0-9]{64}/);
    return match ? match[0] : input;
  };

  const depositTxHash = extractHash(body.deposit_tx_hash);

  const { error: donorErr } = await supabase.from("donors").upsert({ wallet_address: donor }, { onConflict: "wallet_address" });
  if (donorErr) return NextResponse.json({ error: donorErr.message }, { status: 500 });

  const { data: donation, error } = await supabase.from("donations").insert({
    donor_wallet_address: donor,
    input_asset_address: body.input_asset_address,
    target_asset_address: body.target_asset_address,
    amount_in: body.amount_in,
    amount_in_base_units: body.amount_in_base_units,
    chain_id: body.chain_id,
    deposit_tx_hash: depositTxHash,
  }).select("id").single();
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Link recipients to this donation
  if (body.recipient_wallet_addresses && body.recipient_wallet_addresses.length > 0 && donation) {
    const recipients = Array.from(new Set(body.recipient_wallet_addresses.map((x) => x.trim()).filter(Boolean)));
    const rows = recipients.map((r) => ({ donation_id: donation.id, recipient_wallet_address: r }));
    const { error: selError } = await supabase.from("donation_recipient_selections").insert(rows);
    if (selError) {
      console.error("Failed to link recipients:", selError);
      // Don't fail the whole request if recipient linking fails
    }
  }
  
  return NextResponse.json({ ok: true, donation_id: donation?.id });
}

