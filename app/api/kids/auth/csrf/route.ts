import { NextResponse } from "next/server";
import { setCsrfToken } from "@/lib/utils/csrf";

// GET: Generate and return a CSRF token for kid login forms
export async function GET() {
  try {
    const token = await setCsrfToken();

    return NextResponse.json({ csrfToken: token });
  } catch (err) {
    console.error("Error generating CSRF token:", err);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
