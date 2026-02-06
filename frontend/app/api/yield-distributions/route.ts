import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const donor = (url.searchParams.get("donor") || "").trim();
  const recipient = (url.searchParams.get("recipient") || "").trim();

  const supabase = getSupabase();
  let q = supabase.from("yield_distributions").select("*").order("created_at", { ascending: false }).limit(200);
  if (donor) q = q.eq("donor_wallet_address", donor);
  if (recipient) q = q.eq("recipient_wallet_address", recipient);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ yield_distributions: data ?? [] });
}

