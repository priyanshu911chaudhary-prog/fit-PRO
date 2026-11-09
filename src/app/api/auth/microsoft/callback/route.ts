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
  const state = searchParams.get("state");
  const storedState = req.cookies.get("ms_oauth_state")?.value;
  const verifier = req.cookies.get("ms_code_verifier")?.value;

  // Enforce state CSRF validation: both query state and stored cookie state must be present and match
  if (!storedState || !state || state !== storedState) {
    const res = NextResponse.redirect(
      new URL("/login?error=Invalid+or+missing+OAuth+state+parameter", env.APP_URL)
    );
    res.cookies.delete("ms_oauth_state");
    res.cookies.delete("ms_code_verifier");
    return res;
  }

  // Enforce PKCE verifier requirement
  if (!verifier) {
    const res = NextResponse.redirect(
      new URL("/login?error=Missing+PKCE+code+verifier", env.APP_URL)
    );
    res.cookies.delete("ms_oauth_state");
    res.cookies.delete("ms_code_verifier");
    return res;
  }

  if (error || !code) {
    const errorMsg = errorDescription || error || "Microsoft sign-in was cancelled";
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, env.APP_URL)
    );
    res.cookies.delete("ms_oauth_state");
    res.cookies.delete("ms_code_verifier");
    return res;
  }

  if (!env.MICROSOFT_CLIENT_ID) {
    const res = NextResponse.redirect(
      new URL("/login?error=Microsoft+authentication+is+not+configured+on+this+server", env.APP_URL)
    );
    res.cookies.delete("ms_oauth_state");
    res.cookies.delete("ms_code_verifier");
    return res;
  }

  const redirectUri = `${env.APP_URL}/api/auth/microsoft/callback`;

  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set("client_id", env.MICROSOFT_CLIENT_ID);
    tokenParams.set("grant_type", "authorization_code");
    tokenParams.set("code", code);
    tokenParams.set("redirect_uri", redirectUri);
    tokenParams.set("code_verifier", verifier);
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
      const res = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errMsg)}`, env.APP_URL)
      );
      res.cookies.delete("ms_oauth_state");
      res.cookies.delete("ms_code_verifier");
      return res;
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
      const res = NextResponse.redirect(
        new URL("/login?error=Could+not+retrieve+user+profile+from+Microsoft", env.APP_URL)
      );
      res.cookies.delete("ms_code_verifier");
      res.cookies.delete("ms_oauth_state");
      return res;
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
    const newRefreshToken = await user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save();

    const profile = await Profile.findOne({ user: user._id });
    const targetPath = isNewUser || !profile ? "/onboarding" : "/dashboard";

    const response = NextResponse.redirect(new URL(targetPath, env.APP_URL));
    setAuthCookies(response, accessToken, newRefreshToken);
    response.cookies.delete("ms_code_verifier");
    response.cookies.delete("ms_oauth_state");

    return response;
  } catch (err: unknown) {
    logger.error("Microsoft OAuth callback failed", {
      event: "auth.oauth.callback.failed",
      provider: "microsoft",
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    const msg = err instanceof Error ? err.message : "Microsoft authentication failed";
    const res = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, env.APP_URL)
    );
    res.cookies.delete("ms_code_verifier");
    res.cookies.delete("ms_oauth_state");
    return res;
  }
}
