
import crypto from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { setAuthCookies } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { User } from "@/models/user";

export const MS_JWKS = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);

export async function GET() {
  if (!env.MICROSOFT_CLIENT_ID) {
    return NextResponse.json(
      new ApiResponse(500, "Microsoft authentication is not configured on this server", null),
      { status: 500 }
    );
  }

  const verifier = crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const redirectUri = `${env.APP_URL}/api/auth/microsoft/callback`;
  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", env.MICROSOFT_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", "openid profile email offline_access");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("ms_code_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const idToken = body.idToken as string;

  if (!idToken) {
    throw new ApiError(400, "Microsoft ID token is required");
  }

  if (!env.MICROSOFT_CLIENT_ID) {
    throw new ApiError(500, "Microsoft authentication is not configured on this server");
  }

  let payload;
  try {
    const verified = await jwtVerify(idToken, MS_JWKS, {
      audience: env.MICROSOFT_CLIENT_ID,
    });
    payload = verified.payload;
  } catch (err: unknown) {
    throw new ApiError(400, "Invalid Microsoft ID token", [
      err instanceof Error ? err.message : "Token verification failed",
    ]);
  }

  // Approved Fix 14: Identify user by oid/sub + tid, not email alone
  const sub = (payload.sub as string) || (payload.oid as string);
  const tid = payload.tid as string;
  const uniqueMicrosoftId = `${tid}:${sub}`;

  const email =
    (payload.preferred_username as string) || (payload.email as string);
  const name = (payload.name as string) || "Microsoft User";

  if (!sub) {
    throw new ApiError(400, "Unique Microsoft user identifier not found in token");
  }

  // Search by unique Microsoft ID first
  let user = await User.findOne({ microsoftId: uniqueMicrosoftId });

  if (!user && email) {
    // Check if account with email exists to link
    user = await User.findOne({ email });
    if (user && !user.microsoftId) {
      user.microsoftId = uniqueMicrosoftId;
      user.isVerified = true;
      await user.save();
    }
  }

  if (!user) {
    user = await User.create({
      fullName: name,
      email: email || `${sub}@microsoft.oauth`,
      authProvider: "microsoft",
      isVerified: true,
      microsoftId: uniqueMicrosoftId,
    });
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  const response = NextResponse.json(
    new ApiResponse(200, "User logged in successfully via Microsoft", {
      user: loggedInUser,
      accessToken,
      refreshToken,
    }),
    { status: 200 }
  );

  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
