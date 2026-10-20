
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { REFRESH_COOKIE_NAME, setAuthCookies } from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { User } from "@/models/user";

export const POST = withHandler(async (req: NextRequest) => {
  let incomingToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!incomingToken) {
    try {
      const body = await req.json();
      incomingToken = body.refreshToken;
    } catch {
      // Ignore body parsing failure if cookie exists
    }
  }

  if (!incomingToken) {
    throw new ApiError(401, "Unauthorized request: Refresh token is missing");
  }

  let decoded;
  try {
    decoded = await verifyRefreshToken(incomingToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId).select(
    "+refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
  );
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  const isCurrentToken = incomingToken === user.refreshToken;
  const isGraceToken =
    incomingToken === user.previousRefreshToken &&
    user.previousRefreshTokenExpiry &&
    user.previousRefreshTokenExpiry > new Date();

  if (!isCurrentToken && !isGraceToken) {
    throw new ApiError(401, "Refresh token is expired or has already been used");
  }

  let accessToken: string;
  let newRefreshToken: string;

  if (isGraceToken && user.refreshToken) {
    // In-flight parallel request within grace window: reuse active session
    accessToken = await user.generateAccessToken();
    newRefreshToken = user.refreshToken;
  } else {
    // Normal rotation: record previous token in 30s grace window
    accessToken = await user.generateAccessToken();
    newRefreshToken = await user.generateRefreshToken();

    user.previousRefreshToken = user.refreshToken;
    user.previousRefreshTokenExpiry = new Date(Date.now() + 30 * 1000);
    user.refreshToken = newRefreshToken;
    await user.save();
  }

  const response = NextResponse.json(
    new ApiResponse(200, "Access token refreshed", {
      accessToken,
      refreshToken: newRefreshToken,
    }),
    { status: 200 }
  );

  setAuthCookies(response, accessToken, newRefreshToken);
  return response;
});

export const GET = withHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const redirectTarget = url.searchParams.get("redirect") || "/dashboard";
  const loginTarget = new URL(
    `/login?redirect=${encodeURIComponent(redirectTarget)}`,
    req.url
  );

  const incomingToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!incomingToken) {
    return NextResponse.redirect(loginTarget);
  }

  let decoded;
  try {
    decoded = await verifyRefreshToken(incomingToken);
  } catch {
    return NextResponse.redirect(loginTarget);
  }

  const user = await User.findById(decoded.userId).select("+refreshToken");
  if (!user || incomingToken !== user.refreshToken) {
    return NextResponse.redirect(loginTarget);
  }

  const accessToken = await user.generateAccessToken();
  const newRefreshToken = await user.generateRefreshToken();

  user.refreshToken = newRefreshToken;
  await user.save();

  const redirectUrl = new URL(redirectTarget, req.url);
  const response = NextResponse.redirect(redirectUrl);
  setAuthCookies(response, accessToken, newRefreshToken);
  return response;
});
