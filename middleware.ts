import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/investors",
  "/discovery",
  "/outreach",
  "/data-room",
  "/deals",
  "/tasks",
  "/analytics",
  "/settings",
  "/onboarding",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/investors/:path*",
    "/discovery/:path*",
    "/outreach/:path*",
    "/data-room/:path*",
    "/deals/:path*",
    "/tasks/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
