import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = (await req.json()) as {
    donation_id: string;
    withdraw_tx_hash: string;
  };

  if (!body.donation_id || !body.withdraw_tx_hash) {
    return NextResponse.json({ error: "donation_id and withdraw_tx_hash required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("donations")
    .update({
      withdrawn: true,
      withdraw_tx_hash: body.withdraw_tx_hash,
    })
    .eq("id", body.donation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
