import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "demo-mode";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export async function GET(request: NextRequest) {
  const redirectPath = request.nextUrl.searchParams.get("redirect") ?? "/dashboard";
  const url = new URL(redirectPath, request.nextUrl.origin);
  const response = NextResponse.redirect(url);

  response.cookies.set({
    name: COOKIE_NAME,
    value: "true",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
