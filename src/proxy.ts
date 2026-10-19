import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "accessToken";
const REFRESH_COOKIE_NAME = "refreshToken";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/coach",
  "/workout",
  "/meal",
  "/water",
  "/plans",
  "/bmi",
];

const AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthRoute = AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // If user is accessing protected routes
  if (isProtected) {
    if (accessToken) {
      return NextResponse.next();
    }

    const currentUrl = encodeURIComponent(
      pathname + (request.nextUrl.search || "")
    );

    // If access token is expired/missing but refresh token exists,
    // redirect to refresh route handler so new cookies can be set on response
    if (refreshToken) {
      const refreshUrl = new URL(
        `/api/auth/refresh?redirect=${currentUrl}`,
        request.url
      );
      return NextResponse.redirect(refreshUrl);
    }

    // No tokens at all -> redirect to login
    const loginUrl = new URL(`/login?redirect=${currentUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user already authenticated and visits login/register
  if (isAuthRoute && accessToken) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
