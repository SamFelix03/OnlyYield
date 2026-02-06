import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

// GET: Fetch all content for a creator
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const searchParams = req.nextUrl.searchParams;
  const creatorWallet = searchParams.get("creator");

  if (!creatorWallet) {
    return NextResponse.json({ error: "creator wallet address required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creator_content")
    .select("*")
    .eq("creator_wallet_address", creatorWallet.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: data || [] });
}

// POST: Upload content metadata (file should already be uploaded to storage)
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  const {
    creator_wallet_address,
    file_url,
    file_path,
    file_type,
    file_name,
    file_size,
    mime_type,
  } = body;

  if (!creator_wallet_address || !file_url || !file_path || !file_type || !file_name) {
    return NextResponse.json(
      { error: "Missing required fields: creator_wallet_address, file_url, file_path, file_type, file_name" },
      { status: 400 }
    );
  }

  // Validate file_type
  if (!["image", "video"].includes(file_type)) {
    return NextResponse.json({ error: "file_type must be 'image' or 'video'" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creator_content")
    .insert({
      creator_wallet_address: creator_wallet_address.toLowerCase(),
      file_url,
      file_path,
      file_type,
      file_name,
      file_size: file_size || null,
      mime_type: mime_type || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ content: data });
}

// DELETE: Remove content
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const searchParams = req.nextUrl.searchParams;
  const contentId = searchParams.get("id");
  const creatorWallet = searchParams.get("creator");

  if (!contentId || !creatorWallet) {
    return NextResponse.json({ error: "id and creator wallet address required" }, { status: 400 });
  }

  // First, get the file path to delete from storage
  const { data: content, error: fetchError } = await supabase
    .from("creator_content")
    .select("file_path, file_type")
    .eq("id", contentId)
    .eq("creator_wallet_address", creatorWallet.toLowerCase())
    .single();

  if (fetchError || !content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Delete from storage - use the same bucket as profile pictures
  const bucketName = "profilepic";
  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([content.file_path]);

  if (storageError) {
    console.error("Storage deletion error:", storageError);
    // Continue with DB deletion even if storage deletion fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("creator_content")
    .delete()
    .eq("id", contentId)
    .eq("creator_wallet_address", creatorWallet.toLowerCase());

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
