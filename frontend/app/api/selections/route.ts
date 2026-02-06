import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = (await req.json()) as {
    donor_wallet_address: string;
    recipient_wallet_addresses: string[];
  };

  const donor = (body.donor_wallet_address || "").trim();
  const recipients = Array.from(new Set((body.recipient_wallet_addresses || []).map((x) => x.trim()).filter(Boolean)));
  if (!donor) return NextResponse.json({ error: "donor_wallet_address required" }, { status: 400 });
  if (recipients.length === 0) return NextResponse.json({ error: "recipient_wallet_addresses required" }, { status: 400 });

  // Ensure donor exists
  const { error: donorErr } = await supabase.from("donors").upsert({ wallet_address: donor }, { onConflict: "wallet_address" });
  if (donorErr) return NextResponse.json({ error: donorErr.message }, { status: 500 });

  // Replace selection set: delete existing, insert new
  const { error: delErr } = await supabase.from("donor_recipient_selections").delete().eq("donor_wallet_address", donor);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = recipients.map((r) => ({ donor_wallet_address: donor, recipient_wallet_address: r }));
  const { error: insErr } = await supabase.from("donor_recipient_selections").insert(rows);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

