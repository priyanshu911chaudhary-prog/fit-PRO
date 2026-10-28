import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const ACCESS_COOKIE_NAME = "accessToken";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://accounts.google.com https://generativelanguage.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join("; "),
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!res.headers.has(key)) {
      res.headers.set(key, value);
    }
  }
  return res;
}

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

      // Scoped refresh token is sent to /api/auth. Route through refresh handler
      // to transparently restore session or redirect to /login if no valid session exists.
      return applySecurityHeaders(
        NextResponse.redirect(
          new URL(`/api/auth/refresh?redirect=${currentUrl}`, request.url)
        )
      );
    }

    // User is authenticated: check profile completion
    if (!payload.hasProfile) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/onboarding", request.url))
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Onboarding Guard (/onboarding)
  if (isOnboarding) {
    if (!payload) {
      return applySecurityHeaders(
        NextResponse.redirect(
          new URL("/api/auth/refresh?redirect=%2Fonboarding", request.url)
        )
      );
    }

    // User is already onboarded: redirect to /dashboard
    if (payload.hasProfile) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  // 3. If user already authenticated and visits login/register
  if (isAuthRoute && payload) {
    const dest = payload.hasProfile ? "/dashboard" : "/onboarding";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(dest, request.url))
    );
  }

  // 4. If user already authenticated and visits the root landing page (/)
  if (pathname === "/" && payload) {
    const dest = payload.hasProfile ? "/dashboard" : "/onboarding";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(dest, request.url))
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
