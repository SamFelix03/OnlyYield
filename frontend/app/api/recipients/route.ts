import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recipients")
    .select("wallet_address, display_name, created_at, profile_pic_url, social_links, preferred_chain")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipients: data ?? [] });
}

type RecipientBody = {
  wallet_address: string;
  display_name?: string | null;
  profile_pic_url?: string | null;
  social_links?: string[] | null;
  preferred_chain?: string | null;
};

export async function POST(req: Request) {
  const supabase = getSupabase();
  const body = (await req.json()) as RecipientBody;
  const wallet = (body.wallet_address || "").trim();
  if (!wallet) return NextResponse.json({ error: "wallet_address required" }, { status: 400 });

  const { error } = await supabase.from("recipients").upsert(
    {
      wallet_address: wallet,
      display_name: body.display_name || null,
      profile_pic_url: body.profile_pic_url ?? null,
      social_links: body.social_links ?? null,
      preferred_chain: body.preferred_chain || null,
    },
    { onConflict: "wallet_address" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

