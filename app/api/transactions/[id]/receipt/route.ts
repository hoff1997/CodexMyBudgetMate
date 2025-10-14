import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PresignResponse = {
  uploadUrl: string;
  receiptUrl: string;
};

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
  const contentType = String(body.contentType ?? "application/octet-stream");
  const path = `${session.user.id}/${params.id}/${fileName}`;

  // TODO: call Supabase Storage to create signed URL
  const fakeUrl = `https://storage.supabase.local/receipts/${encodeURIComponent(path)}`;

  const payload: PresignResponse = {
    uploadUrl: fakeUrl,
    receiptUrl: fakeUrl,
  };

  return NextResponse.json(payload);
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
  const receiptUrl = String(body.receiptUrl ?? "").trim();
  if (!receiptUrl) {
    return NextResponse.json({ error: "receiptUrl is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("transactions")
    .update({ receipt_url: receiptUrl })
    .eq("id", params.id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ receiptUrl });
}
