import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createReceiptUploadUrl, createSignedReceiptUrl, removeReceipt } from "@/lib/storage/receipts";
import { createErrorResponse, createNotFoundError, createUnauthorizedError, createValidationError } from "@/lib/utils/api-error";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    return createNotFoundError("Transaction");
  }

  const body = await request.json();
  const fileName = String(body.fileName ?? "").trim() || `${params.id}.bin`;
  const contentTypeRaw = String(body.contentType ?? "application/octet-stream");
  const contentType = contentTypeRaw.toLowerCase();
  if (!contentType.startsWith("image/") && contentType !== "application/pdf") {
    return createValidationError("Unsupported file type");
  }

  try {
    const { uploadUrl, path } = await createReceiptUploadUrl({
      userId: user.id,
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
    return createErrorResponse(error as { message: string }, 500, "Unable to create upload URL");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedError();
  }

  const body = await request.json();
  const receiptPath = String(body.receiptPath ?? "").trim();
  if (!receiptPath) {
    return createValidationError("receiptPath is required");
  }

  const expectedPrefix = `${user.id}/`;
  if (!receiptPath.startsWith(expectedPrefix)) {
    return createValidationError("Path does not belong to user");
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id, receipt_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return createErrorResponse(existingError, 400, "Failed to fetch transaction");
  }

  if (!existing) {
    return createNotFoundError("Transaction");
  }

  const previousPath = existing.receipt_url ? String(existing.receipt_url) : null;

  const { error } = await supabase
    .from("transactions")
    .update({ receipt_url: receiptPath })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return createErrorResponse(error, 400, "Failed to update receipt");
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
