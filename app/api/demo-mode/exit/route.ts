import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "demo-mode";

export async function GET(request: NextRequest) {
  const redirectPath = request.nextUrl.searchParams.get("redirect") ?? "/login";
  const url = new URL(redirectPath, request.nextUrl.origin);
  const response = NextResponse.redirect(url);

  response.cookies.delete(COOKIE_NAME);

  return response;
}
