import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { setAuthCookies } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error || !code) {
    const errorMsg = errorDescription || error || "Microsoft sign-in was cancelled";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, env.APP_URL)
    );
  }

  if (!env.MICROSOFT_CLIENT_ID) {
    return NextResponse.redirect(
      new URL("/login?error=Microsoft+authentication+is+not+configured+on+this+server", env.APP_URL)
    );
  }

  const verifier = req.cookies.get("ms_code_verifier")?.value;
  const redirectUri = `${env.APP_URL}/api/auth/microsoft/callback`;

  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set("client_id", env.MICROSOFT_CLIENT_ID);
    tokenParams.set("grant_type", "authorization_code");
    tokenParams.set("code", code);
    tokenParams.set("redirect_uri", redirectUri);
    if (verifier) {
      tokenParams.set("code_verifier", verifier);
    }
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || env.MICROSOFT_CLIENT_SECRET;
    if (clientSecret) {
      tokenParams.set("client_secret", clientSecret);
    }

    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      let errMsg = tokenData.error_description || tokenData.error || "Failed to exchange Microsoft token";
      if (typeof errMsg === "string" && errMsg.includes("AADSTS70002")) {
        errMsg = "Microsoft App requires MICROSOFT_CLIENT_SECRET in your .env, or configure the Azure App platform as Single-Page Application (SPA) with PKCE.";
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errMsg)}`, env.APP_URL)
      );
    }

    // Extract user profile from id_token and/or Microsoft Graph
    let email = "";
    let name = "Microsoft User";
    let sub = "";
    let tid = "";

    if (tokenData.id_token) {
      try {
        const claims = decodeJwt(tokenData.id_token);
        sub = (claims.sub as string) || (claims.oid as string) || "";
        tid = (claims.tid as string) || "";
        email =
          (claims.preferred_username as string) ||
          (claims.email as string) ||
          (claims.upn as string) ||
          "";
        name = (claims.name as string) || "Microsoft User";
      } catch {
        // Fall back to Graph
      }
    }

    // Call Microsoft Graph API for canonical profile details
    try {
      const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (graphRes.ok) {
        const graphUser = await graphRes.json();
        if (graphUser.mail) email = graphUser.mail;
        else if (!email && graphUser.userPrincipalName) email = graphUser.userPrincipalName;
        if (graphUser.displayName) name = graphUser.displayName;
        if (!sub && graphUser.id) sub = graphUser.id;
      }
    } catch {
      // Continue with ID token claims
    }

    if (!sub && !email) {
      return NextResponse.redirect(
        new URL("/login?error=Could+not+retrieve+user+profile+from+Microsoft", env.APP_URL)
      );
    }

    const uniqueMicrosoftId = tid ? `${tid}:${sub}` : sub;

    // Find user by microsoftId or email
    let user = await User.findOne({ microsoftId: uniqueMicrosoftId });
    let isNewUser = false;

    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        if (!user.microsoftId) {
          user.microsoftId = uniqueMicrosoftId;
          user.isVerified = true;
          await user.save();
        }
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
      isNewUser = true;
    }

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    const profile = await Profile.findOne({ user: user._id });
    const targetPath = isNewUser || !profile ? "/onboarding" : "/dashboard";

    const response = NextResponse.redirect(new URL(targetPath, env.APP_URL));
    setAuthCookies(response, accessToken, refreshToken);
    response.cookies.delete("ms_code_verifier");

    return response;
  } catch (err: unknown) {
    logger.error("Microsoft OAuth callback failed", {
      event: "auth.oauth.callback.failed",
      provider: "microsoft",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    const msg = err instanceof Error ? err.message : "Microsoft authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, env.APP_URL)
    );
  }
}
