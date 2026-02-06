import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

// POST: Handle file upload to Supabase storage
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const creatorWallet = formData.get("creator_wallet_address") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!creatorWallet) {
      return NextResponse.json({ error: "creator_wallet_address required" }, { status: 400 });
    }

    // Determine file type
    const mimeType = file.type || "";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "File must be an image or video" }, { status: 400 });
    }

    const fileType = isImage ? "image" : "video";
    const bucketName = "profilepic"; // Use the same bucket as profile pictures

    // Generate unique file path - use "content/" prefix to separate from profile pics
    const ext = file.name.split(".").pop() || (isImage ? "jpg" : "mp4");
    const timestamp = Date.now();
    const sanitizedWallet = creatorWallet.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const filePath = `content/${sanitizedWallet}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: false,
        contentType: mimeType,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Return file metadata (caller will save to database via /api/creator-content POST)
    return NextResponse.json({
      file_url: publicUrl,
      file_path: filePath,
      file_type: fileType,
      file_name: file.name,
      file_size: file.size,
      mime_type: mimeType,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
