import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

// Returns per-donation entries attributed to a specific creator (recipient)
// Each donation's amount_in is split equally among all recipients selected for that donation.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const recipient = (url.searchParams.get("recipient") || "").trim();
  if (!recipient) {
    return NextResponse.json({ error: "recipient required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // All selection rows for this recipient.
  // Some schemas name this table `donation_recepient_selections` (typo), so try both.
  let selectionsResp = await supabase
    .from("donation_recipient_selections")
    .select("donation_id, recipient_wallet_address, created_at")
    .eq("recipient_wallet_address", recipient)
    .order("created_at", { ascending: false })
    .limit(500);

  if (selectionsResp.error && selectionsResp.error.message.includes("does not exist")) {
    selectionsResp = await supabase
      .from("donation_recepient_selections" as any)
      .select("donation_id, recipient_wallet_address, created_at")
      .eq("recipient_wallet_address", recipient)
      .order("created_at", { ascending: false })
      .limit(500);
  }

  const { data: selections, error: selError } = selectionsResp;
  if (selError) {
    return NextResponse.json({ error: selError.message }, { status: 500 });
  }

  if (!selections || selections.length === 0) {
    return NextResponse.json({ donations: [] });
  }

  const donationIds = Array.from(new Set(selections.map((s) => s.donation_id)));

  // Fetch donation amounts for these ids
  const { data: donations, error: donError } = await supabase
    .from("donations")
    .select("id, amount_in, created_at")
    .in("id", donationIds);

  if (donError) {
    return NextResponse.json({ error: donError.message }, { status: 500 });
  }

  // Fetch all selections for these donations to know how many recipients share each donation
  const { data: allSelections, error: allSelError } = await supabase
    .from("donation_recipient_selections")
    .select("donation_id")
    .in("donation_id", donationIds);

  if (allSelError) {
    return NextResponse.json({ error: allSelError.message }, { status: 500 });
  }

  const recipientCountByDonation: Record<string, number> = {};
  for (const row of allSelections || []) {
    const id = row.donation_id as string;
    recipientCountByDonation[id] = (recipientCountByDonation[id] || 0) + 1;
  }

  const donationById = new Map<string, { amount_in: string; created_at: string }>();
  for (const d of donations || []) {
    donationById.set(d.id as string, {
      amount_in: d.amount_in as string,
      created_at: d.created_at as string,
    });
  }

  // Build per-donation entries with per-recipient share
  const result = selections
    .map((sel) => {
      const d = donationById.get(sel.donation_id as string);
      if (!d) return null;
      const totalRecipients = recipientCountByDonation[sel.donation_id as string] || 1;
      const amount = Number(d.amount_in || 0) / totalRecipients;
      return {
        donation_id: sel.donation_id,
        created_at: d.created_at,
        amount,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ donations: result });
}

