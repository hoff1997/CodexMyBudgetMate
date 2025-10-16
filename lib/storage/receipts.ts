import { createServiceClient } from "@/lib/supabase/service";

const RECEIPTS_BUCKET = process.env.SUPABASE_RECEIPTS_BUCKET ?? "receipts";
const DEFAULT_SIGN_EXPIRY = 60 * 60 * 24; // 24 hours

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function buildReceiptPath(userId: string, transactionId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName || `${transactionId}.bin`);
  return `${userId}/${transactionId}/${safeName}`;
}

export async function createReceiptUploadUrl(options: {
  userId: string;
  transactionId: string;
  fileName: string;
}) {
  const client = createServiceClient();
  const path = buildReceiptPath(options.userId, options.transactionId, options.fileName);

  const { data, error } = await client.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create signed upload URL");
  }

  return {
    uploadUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  };
}

export async function createSignedReceiptUrl(path: string, expiresIn = DEFAULT_SIGN_EXPIRY) {
  const client = createServiceClient();
  const { data, error } = await client.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create signed receipt URL");
  }

  return {
    signedUrl: data.signedUrl,
    expiresIn,
  };
}

export async function removeReceipt(path: string) {
  const client = createServiceClient();
  const { error } = await client.storage.from(RECEIPTS_BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function applySignedReceiptUrls<T extends { receipt_url?: string | null }>(
  rows: T[],
  expiresIn = DEFAULT_SIGN_EXPIRY,
) {
  const paths = Array.from(
    new Set(rows.map((row) => (row.receipt_url ? String(row.receipt_url) : null)).filter(Boolean)),
  ) as string[];

  if (!paths.length) {
    return rows;
  }

  const urlMap = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      try {
        const { signedUrl } = await createSignedReceiptUrl(path, expiresIn);
        urlMap.set(path, signedUrl);
      } catch (error) {
        console.error("Failed to sign receipt URL", path, error);
      }
    }),
  );

  return rows.map((row) => {
    if (!row.receipt_url) return row;
    const signedUrl = urlMap.get(String(row.receipt_url));
    if (!signedUrl) {
      return { ...row, receipt_url: null } as T;
    }
    return { ...row, receipt_url: signedUrl } as T;
  }) as T[];
}
