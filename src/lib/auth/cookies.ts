import { NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "accessToken";
export const REFRESH_COOKIE_NAME = "refreshToken";

export const ACCESS_COOKIE_MAX_AGE = 15 * 60; // 15 minutes in seconds
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = process.env.NODE_ENV === "production";

  // Access token cookie
  res.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  // Refresh token cookie (scoped to /api/auth as requested)
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookies(res: NextResponse): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookies.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}
