import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const ACCESS_COOKIE_NAME = "accessToken";
const REFRESH_COOKIE_NAME = "refreshToken";

const APP_PAGES = [
  "/dashboard",
  "/water",
  "/workout",
  "/meal",
  "/bmi",
  "/plans",
  "/coach",
  "/profile",
];

const AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const isAppPage = APP_PAGES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isAuthRoute = AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let payload = null;
  if (accessToken) {
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      payload = null;
    }
  }

  // 1. App Pages Guard (/dashboard, /water, /workout, /meal, /bmi, /plans, /coach, /profile)
  if (isAppPage) {
    if (!payload) {
      const currentUrl = encodeURIComponent(
        pathname + (request.nextUrl.search || "")
      );

      // If access token is expired/missing but refresh token exists,
      // redirect to refresh route handler so new cookies can be set on response
      if (refreshToken) {
        return NextResponse.redirect(
          new URL(`/api/auth/refresh?redirect=${currentUrl}`, request.url)
        );
      }

      // No tokens at all -> redirect to login
      return NextResponse.redirect(
        new URL(`/login?redirect=${currentUrl}`, request.url)
      );
    }

    // User is authenticated: check profile completion
    if (!payload.hasProfile) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    return NextResponse.next();
  }

  // 2. Onboarding Guard (/onboarding)
  if (isOnboarding) {
    if (!payload) {
      if (refreshToken) {
        return NextResponse.redirect(
          new URL("/api/auth/refresh?redirect=%2Fonboarding", request.url)
        );
      }
      return NextResponse.redirect(
        new URL("/login?redirect=%2Fonboarding", request.url)
      );
    }

    // User is already onboarded: redirect to /dashboard
    if (payload.hasProfile) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // 3. If user already authenticated and visits login/register
  if (isAuthRoute && payload) {
    const dest = payload.hasProfile ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
