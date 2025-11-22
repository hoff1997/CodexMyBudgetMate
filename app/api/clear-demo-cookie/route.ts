import { NextResponse } from "next/server";

/**
 * GET /api/clear-demo-cookie
 *
 * Manually clears the demo-mode cookie
 * Useful for debugging when cookie is stuck
 */
export async function GET() {
  const response = NextResponse.json({
    success: true,
    message: "Demo mode cookie cleared"
  });

  response.cookies.delete("demo-mode");

  return response;
}
