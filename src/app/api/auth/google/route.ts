
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { setAuthCookies } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { User } from "@/models/user";

export async function GET() {
  if (!env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      new ApiResponse(500, "Google authentication is not configured on this server", null),
      { status: 500 }
    );
  }

  const redirectUri = `${env.APP_URL}/api/auth/google/callback`;
  const client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "select_account",
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_oauth_state", state, {
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
  let idToken = body.idToken as string | undefined;

  if (!idToken && body.code) {
    const redirectUri = body.redirectUri || "postmessage";
    const codeClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    try {
      const { tokens } = await codeClient.getToken(body.code as string);
      idToken = tokens.id_token ?? undefined;
    } catch (tokenErr: unknown) {
      throw new ApiError(400, "Failed to exchange Google authorization code", [
        tokenErr instanceof Error ? tokenErr.message : "Code exchange failed",
      ]);
    }
  }

  if (!idToken) {
    throw new ApiError(400, "Google ID token or authorization code is required");
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "Google authentication is not configured on this server");
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (err: unknown) {
    throw new ApiError(400, "Invalid Google ID token", [
      err instanceof Error ? err.message : "Token verification failed",
    ]);
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new ApiError(400, "Email not found in Google ID token");
  }

  // Approved Fix 14: Link by email only if email_verified is true
  if (!payload.email_verified) {
    throw new ApiError(400, "Google email is not verified by Google");
  }

  const { email, name, sub: googleId } = payload;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      fullName: name || "Google User",
      email,
      authProvider: "google",
      isVerified: true,
      googleId,
    });
  } else {
    if (!user.googleId) {
      user.googleId = googleId;
      user.isVerified = true;
      await user.save();
    }
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  const response = NextResponse.json(
    new ApiResponse(200, "User logged in successfully via Google", {
      user: loggedInUser,
      accessToken,
      refreshToken,
    }),
    { status: 200 }
  );

  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
