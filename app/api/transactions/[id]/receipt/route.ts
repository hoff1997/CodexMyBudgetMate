import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createReceiptUploadUrl, createSignedReceiptUrl, removeReceipt } from "@/lib/storage/receipts";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const body = await request.json();
  const fileName = String(body.fileName ?? "").trim() || `${params.id}.bin`;
  const contentTypeRaw = String(body.contentType ?? "application/octet-stream");
  const contentType = contentTypeRaw.toLowerCase();
  if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const { uploadUrl, path } = await createReceiptUploadUrl({
      userId: session.user.id,
      transactionId: params.id,
      fileName,
    });

    return NextResponse.json({
      uploadUrl,
      receiptPath: path,
      headers: {
        "Content-Type": contentTypeRaw,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create upload URL" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const receiptPath = String(body.receiptPath ?? "").trim();
  if (!receiptPath) {
    return NextResponse.json({ error: "receiptPath is required" }, { status: 400 });
  }

  const expectedPrefix = `${session.user.id}/`;
  if (!receiptPath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Path does not belong to user" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id, receipt_url")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const previousPath = existing.receipt_url ? String(existing.receipt_url) : null;

  const { error } = await supabase
    .from("transactions")
    .update({ receipt_url: receiptPath })
    .eq("id", params.id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (previousPath && previousPath !== receiptPath) {
    removeReceipt(previousPath).catch((err) => {
      console.error("Failed to remove previous receipt", err);
    });
  }

  try {
    const { signedUrl, expiresIn } = await createSignedReceiptUrl(receiptPath);
    return NextResponse.json({ receiptUrl: signedUrl, receiptPath, expiresIn });
  } catch (signedError) {
    console.error(signedError);
    return NextResponse.json({ receiptPath }, { status: 200 });
  }
}
