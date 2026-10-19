import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("google_oauth_state")?.value;

  // Verify OAuth state if one was issued
  if (storedState && state && state !== storedState) {
    const res = NextResponse.redirect(
      new URL("/login?error=Invalid+OAuth+state+parameter", env.APP_URL)
    );
    res.cookies.delete("google_oauth_state");
    return res;
  }

  if (error || !code) {
    const errorMsg = error || "Google sign-in was cancelled";
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, env.APP_URL)
    );
    res.cookies.delete("google_oauth_state");
    return res;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/login?error=Google+OAuth+credentials+not+configured", env.APP_URL)
    );
  }

  const redirectUri = `${env.APP_URL}/api/auth/google/callback`;
  const client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      return NextResponse.redirect(
        new URL("/login?error=Failed+to+obtain+Google+ID+token", env.APP_URL)
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.redirect(
        new URL("/login?error=Email+not+found+in+Google+account", env.APP_URL)
      );
    }

    if (!payload.email_verified) {
      return NextResponse.redirect(
        new URL("/login?error=Google+email+is+not+verified", env.APP_URL)
      );
    }

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        fullName: name || "Google User",
        email,
        authProvider: "google",
        isVerified: true,
        googleId,
      });
      isNewUser = true;
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

    // Check if onboarding completed
    const profile = await Profile.findOne({ user: user._id });
    const targetPath = isNewUser || !profile ? "/onboarding" : "/dashboard";

    const response = NextResponse.redirect(new URL(targetPath, env.APP_URL));
    response.cookies.delete("google_oauth_state");
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err: unknown) {
    console.error("Google OAuth callback error:", err);
    const msg = err instanceof Error ? err.message : "Authentication failed";
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, env.APP_URL)
    );
    res.cookies.delete("google_oauth_state");
    return res;
  }
}
