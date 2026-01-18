import { NextResponse } from "next/server";
import { setCsrfToken } from "@/lib/utils/csrf";
import { createErrorResponse } from "@/lib/utils/api-error";

// GET: Generate and return a CSRF token for kid login forms
export async function GET() {
  try {
    const token = await setCsrfToken();

    return NextResponse.json({ csrfToken: token });
  } catch (err) {
    console.error("Error generating CSRF token:", err);
    return createErrorResponse(err as Error, 500, "Failed to generate CSRF token");
  }
}
