import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

// GET: Fetch content from creators that the donor has donated to
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const searchParams = req.nextUrl.searchParams;
  const donorWallet = searchParams.get("donor");

  if (!donorWallet) {
    return NextResponse.json({ error: "donor wallet address required" }, { status: 400 });
  }

  try {
    // Step 1: Get all donations by this donor
    const { data: donations, error: donationsError } = await supabase
      .from("donations")
      .select("id")
      .eq("donor_wallet_address", donorWallet.toLowerCase());

    if (donationsError) {
      return NextResponse.json({ error: donationsError.message }, { status: 500 });
    }

    if (!donations || donations.length === 0) {
      return NextResponse.json({ content: [] });
    }

    const donationIds = donations.map((d) => d.id);

    // Step 2: Get all recipients linked to these donations
    const { data: selections, error: selectionsError } = await supabase
      .from("donation_recipient_selections")
      .select("recipient_wallet_address")
      .in("donation_id", donationIds);

    if (selectionsError) {
      return NextResponse.json({ error: selectionsError.message }, { status: 500 });
    }

    if (!selections || selections.length === 0) {
      return NextResponse.json({ content: [] });
    }

    // Get unique recipient addresses
    const recipientAddresses = [
      ...new Set(selections.map((s) => s.recipient_wallet_address.toLowerCase())),
    ];

    // Step 3: Get all content from these recipients
    const { data: content, error: contentError } = await supabase
      .from("creator_content")
      .select("*")
      .in("creator_wallet_address", recipientAddresses)
      .order("created_at", { ascending: false });

    if (contentError) {
      return NextResponse.json({ error: contentError.message }, { status: 500 });
    }

    // Step 4: Enrich with creator info
    const { data: recipients } = await supabase
      .from("recipients")
      .select("wallet_address, display_name, profile_pic_url")
      .in("wallet_address", recipientAddresses);

    const recipientMap = new Map(
      (recipients || []).map((r) => [r.wallet_address.toLowerCase(), r])
    );

    const enrichedContent = (content || []).map((item) => ({
      ...item,
      creator: recipientMap.get(item.creator_wallet_address.toLowerCase()) || null,
    }));

    return NextResponse.json({ content: enrichedContent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch feed" }, { status: 500 });
  }
}
