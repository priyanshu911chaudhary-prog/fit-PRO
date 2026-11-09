import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { SignJWT } from "jose";

// Direct production code imports
import { connectDB } from "@/lib/db";
import { User, IUser } from "@/models/user";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/cookies";
import { env } from "@/lib/env";

// Route handlers under test
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { POST as refreshPostHandler, GET as refreshGetHandler } from "@/app/api/auth/refresh/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/[token]/route";
import { POST as changePasswordHandler } from "@/app/api/auth/change-password/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as profileGetHandler } from "@/app/api/profile/route";
import { GET as googleCallbackHandler } from "@/app/api/auth/google/callback/route";
import { GET as microsoftCallbackHandler } from "@/app/api/auth/microsoft/callback/route";

const emptyContext: unknown = undefined;

describe("Quality Suite: Authentication & Session Security", () => {
  const createdUserIds: mongoose.Types.ObjectId[] = [];

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.connection.close();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  async function createTestUser(overrides: Partial<IUser> = {}) {
    const randomHex = crypto.randomBytes(6).toString("hex");
    const user = await User.create({
      fullName: `Test User ${randomHex}`,
      email: `test_auth_${randomHex}@quality-test.local`,
      password: "InitialPassword123!",
      isVerified: true,
      authProvider: "local",
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  // =========================================================================
  // Defect A: Logout Invalidation of Complete Refresh-Session State
  // =========================================================================
  describe("Defect A: Logout Invalidation of Complete Refresh-Session State", () => {
    it("clears cookies and removes all refresh-token state from the database on logout", async () => {
      const user = await createTestUser();
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      // Persist active and previous refresh session state
      user.refreshToken = refreshToken;
      user.previousRefreshToken = "old_rotated_token_grace";
      user.previousRefreshTokenExpiry = new Date(Date.now() + 30000);
      await user.save();

      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}; ${REFRESH_COOKIE_NAME}=${refreshToken}`,
        },
      });

      const res = await logoutHandler(req, emptyContext);
      expect(res.status).toBe(200);

      // Verify response cookies are cleared
      const setCookieHeader = res.headers.get("set-cookie") || "";
      expect(setCookieHeader).toContain(`${ACCESS_COOKIE_NAME}=;`);
      expect(setCookieHeader).toContain(`${REFRESH_COOKIE_NAME}=;`);

      // Verify complete database removal of all refresh fields
      const userInDb = await User.findById(user._id).select(
        "+refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
      );
      expect(userInDb?.refreshToken).toBeFalsy();
      expect(userInDb?.previousRefreshToken).toBeFalsy();
      expect(userInDb?.previousRefreshTokenExpiry).toBeFalsy();
    });

    it("proves a token previously accepted in the rotation grace period is rejected after logout", async () => {
      const user = await createTestUser();
      const accessToken = await user.generateAccessToken();
      const currentRefreshToken = await user.generateRefreshToken();
      const previousRefreshToken = await user.generateRefreshToken();

      // Configure a valid 30s grace window for previousRefreshToken
      user.refreshToken = currentRefreshToken;
      user.previousRefreshToken = previousRefreshToken;
      user.previousRefreshTokenExpiry = new Date(Date.now() + 30000);
      await user.save();

      // Log out
      const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}; ${REFRESH_COOKIE_NAME}=${currentRefreshToken}`,
        },
      });
      const logoutRes = await logoutHandler(logoutReq, emptyContext);
      expect(logoutRes.status).toBe(200);

      // Attempt refresh using previousRefreshToken within the original 30s grace window
      const refreshReq = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: {
          cookie: `${REFRESH_COOKIE_NAME}=${previousRefreshToken}`,
        },
      });

      const refreshRes = await refreshPostHandler(refreshReq, emptyContext);
      // MUST be 401 Unauthorized; logout must not allow grace token to revive session
      expect(refreshRes.status).toBe(401);
    });

    it("clears cookies safely when access token is invalid/expired without revoking another session", async () => {
      const user = await createTestUser();
      const validRefreshToken = await user.generateRefreshToken();
      user.refreshToken = validRefreshToken;
      await user.save();

      const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=invalid.jwt.token; ${REFRESH_COOKIE_NAME}=${validRefreshToken}`,
        },
      });

      const res = await logoutHandler(logoutReq, emptyContext);
      expect(res.status).toBe(200);
      const setCookieHeader = res.headers.get("set-cookie") || "";
      expect(setCookieHeader).toContain(`${ACCESS_COOKIE_NAME}=;`);

      // Database state of unrelated/unresolved user should not be arbitrarily corrupted
      const userInDb = await User.findById(user._id).select("+refreshToken");
      expect(userInDb?.refreshToken).toBe(validRefreshToken);
    });
  });

  // =========================================================================
  // Defect B: Refresh Redirect Same-Origin Only
  // =========================================================================
  describe("Defect B: Refresh Redirect Same-Origin Only", () => {
    it("preserves legitimate same-origin relative path with query parameters", async () => {
      const user = await createTestUser();
      const refreshToken = await user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save();

      const targetPath = "/workouts?date=2026-10-29&filter=push#sets";
      const req = new NextRequest(
        `http://localhost:3000/api/auth/refresh?redirect=${encodeURIComponent(targetPath)}`,
        {
          headers: {
            cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}`,
          },
        }
      );

      const res = await refreshGetHandler(req, emptyContext);
      expect([302, 307, 308]).toContain(res.status);

      const location = res.headers.get("location");
      expect(location).toBeTruthy();
      const targetUrl = new URL(location!, "http://localhost:3000");
      expect(targetUrl.origin).toBe("http://localhost:3000");
      expect(targetUrl.pathname).toBe("/workouts");
      expect(targetUrl.search).toBe("?date=2026-10-29&filter=push");
    });

    it.each([
      "https://attacker.example/phish",
      "http://attacker.example/phish",
      "//attacker.example/phish",
      "///attacker.example",
      "/\\attacker.example",
      "\\\\attacker.example",
      "javascript:alert(1)",
      "data:text/html,evil",
      "https://evil.com@localhost:3000",
    ])("rejects off-origin target '%s' and safely falls back to /dashboard", async (maliciousTarget) => {
      const user = await createTestUser();
      const refreshToken = await user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save();

      const req = new NextRequest(
        `http://localhost:3000/api/auth/refresh?redirect=${encodeURIComponent(maliciousTarget)}`,
        {
          headers: {
            cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}`,
          },
        }
      );

      const res = await refreshGetHandler(req, emptyContext);
      const location = res.headers.get("location");
      expect(location).toBeTruthy();

      const resolved = new URL(location!, "http://localhost:3000");
      expect(resolved.origin).toBe("http://localhost:3000");
      expect(resolved.pathname).toBe("/dashboard");
      expect(location).not.toContain("attacker.example");
      expect(location).not.toContain("evil.com");
    });

    it("unauthenticated request with malicious redirect sends user to /login with safe redirect target", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/auth/refresh?redirect=https://attacker.example/phish"
      );

      const res = await refreshGetHandler(req, emptyContext);
      const location = res.headers.get("location");
      expect(location).toBeTruthy();

      const resolved = new URL(location!, "http://localhost:3000");
      expect(resolved.origin).toBe("http://localhost:3000");
      expect(resolved.pathname).toBe("/login");
      // The parameter inside /login?redirect=... must be the safe fallback, not the attacker's URL
      expect(resolved.searchParams.get("redirect")).toBe("/dashboard");
      expect(location).not.toContain("attacker.example");
    });
  });

  // =========================================================================
  // Defect C: OAuth CSRF & Session Binding
  // =========================================================================
  describe("Defect C: OAuth CSRF & Session Binding", () => {
    describe("Google OAuth Callback State Validation", () => {
      it("fails closed when query state parameter is missing, even if cookie state exists", async () => {
        const { OAuth2Client } = await import("google-auth-library");
        const getTokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken");

        const req = new NextRequest("http://localhost:3000/api/auth/google/callback?code=mock_code", {
          headers: {
            cookie: "google_oauth_state=expected_random_state_123",
          },
        });

        const res = await googleCallbackHandler(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") || "";
        expect(location).toContain("/login");
        expect(location).toContain("error=");

        // The state check must abort BEFORE attempting token exchange with Google
        expect(getTokenSpy).not.toHaveBeenCalled();

        // Must delete state cookie
        const setCookie = res.headers.get("set-cookie") || "";
        expect(setCookie).toContain("google_oauth_state=;");
      });

      it("fails closed when stored state cookie is missing, even if query state is sent", async () => {
        const { OAuth2Client } = await import("google-auth-library");
        const getTokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken");

        const req = new NextRequest(
          "http://localhost:3000/api/auth/google/callback?code=mock_code&state=some_state"
        );

        const res = await googleCallbackHandler(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") || "";
        expect(location).toContain("/login");
        expect(location).toContain("error=");

        // Must abort before token exchange
        expect(getTokenSpy).not.toHaveBeenCalled();
      });

      it("fails closed when query state does not match cookie state", async () => {
        const { OAuth2Client } = await import("google-auth-library");
        const getTokenSpy = vi.spyOn(OAuth2Client.prototype, "getToken");

        const req = new NextRequest(
          "http://localhost:3000/api/auth/google/callback?code=mock_code&state=attacker_state",
          {
            headers: {
              cookie: "google_oauth_state=victim_legit_state",
            },
          }
        );

        const res = await googleCallbackHandler(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") || "";
        expect(location).toContain("/login");
        expect(location).toContain("error=");

        // Must abort before token exchange
        expect(getTokenSpy).not.toHaveBeenCalled();
      });
    });

    describe("Microsoft OAuth PKCE & State Validation", () => {
      it("fails closed when PKCE code verifier cookie is absent", async () => {
        const fetchSpy = vi.spyOn(global, "fetch");

        const req = new NextRequest(
          "http://localhost:3000/api/auth/microsoft/callback?code=mock_auth_code&state=matching_state",
          {
            headers: {
              cookie: "ms_oauth_state=matching_state",
            },
          }
        );

        const res = await microsoftCallbackHandler(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location") || "";
        expect(location).toContain("/login");
        expect(location).toContain("error=");

        // Must abort before attempting token exchange
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it("fails closed when state cookie or query parameter is absent or mismatched", async () => {
        const fetchSpy = vi.spyOn(global, "fetch");

        // Missing state parameter
        const reqNoState = new NextRequest(
          "http://localhost:3000/api/auth/microsoft/callback?code=mock_auth_code",
          {
            headers: {
              cookie: "ms_code_verifier=valid_verifier_123; ms_oauth_state=some_state",
            },
          }
        );

        const resNoState = await microsoftCallbackHandler(reqNoState);
        expect(resNoState.status).toBe(307);
        expect(resNoState.headers.get("location")).toContain("/login?error=");
        expect(fetchSpy).not.toHaveBeenCalled();

        // Mismatched state parameter
        const reqMismatch = new NextRequest(
          "http://localhost:3000/api/auth/microsoft/callback?code=mock_auth_code&state=forged_state",
          {
            headers: {
              cookie: "ms_code_verifier=valid_verifier_123; ms_oauth_state=legit_state",
            },
          }
        );

        const resMismatch = await microsoftCallbackHandler(reqMismatch);
        expect(resMismatch.status).toBe(307);
        expect(resMismatch.headers.get("location")).toContain("/login?error=");
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // Defect D: Password Reset Invalidates Active Sessions
  // =========================================================================
  describe("Defect D: Password Reset Invalidates Active Sessions", () => {
    it("invalidates all active refresh tokens and rotation grace window upon password reset", async () => {
      const user = await createTestUser();
      const currentRefreshToken = await user.generateRefreshToken();
      const previousRefreshToken = await user.generateRefreshToken();

      // Configure active session and previous token
      user.refreshToken = currentRefreshToken;
      user.previousRefreshToken = previousRefreshToken;
      user.previousRefreshTokenExpiry = new Date(Date.now() + 30000);

      // Generate password reset token
      const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(15 * 60 * 1000);
      user.forgotPasswordToken = hashedToken;
      user.forgotPasswordTokenExpiry = tokenExpiry;
      await user.save();

      const newPassword = "BrandNewSecurePassword123!";
      const req = new NextRequest(
        `http://localhost:3000/api/auth/reset-password/${unhasedToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );

      const res = await resetPasswordHandler(req, {
        params: Promise.resolve({ token: unhasedToken }),
      });
      expect(res.status).toBe(200);

      // Verify the password was updated and properly hashed
      const updatedUser = await User.findById(user._id).select(
        "+password +refreshToken +previousRefreshToken +previousRefreshTokenExpiry +forgotPasswordToken"
      );
      expect(updatedUser).toBeTruthy();
      const passwordMatches = await updatedUser!.comparePassword(newPassword);
      expect(passwordMatches).toBe(true);

      // Reset token must be consumed
      expect(updatedUser?.forgotPasswordToken).toBeFalsy();

      // All session refresh tokens MUST be revoked from MongoDB
      expect(updatedUser?.refreshToken).toBeFalsy();
      expect(updatedUser?.previousRefreshToken).toBeFalsy();
      expect(updatedUser?.previousRefreshTokenExpiry).toBeFalsy();

      // Attempting to refresh with the prior refresh token MUST be rejected
      const refreshReq = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: {
          cookie: `${REFRESH_COOKIE_NAME}=${currentRefreshToken}`,
        },
      });
      const refreshRes = await refreshPostHandler(refreshReq, emptyContext);
      expect(refreshRes.status).toBe(401);
    });

    it("rejects expired reset token without changing password or invalidating active session", async () => {
      const user = await createTestUser();
      const activeRefreshToken = await user.generateRefreshToken();
      user.refreshToken = activeRefreshToken;

      // Expired token (10 minutes in the past)
      const { unhasedToken, hashedToken } = user.generateTemporaryToken(-10 * 60 * 1000);
      user.forgotPasswordToken = hashedToken;
      user.forgotPasswordTokenExpiry = new Date(Date.now() - 10 * 60 * 1000);
      await user.save();

      const req = new NextRequest(
        `http://localhost:3000/api/auth/reset-password/${unhasedToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: "AnotherNewPassword123!" }),
        }
      );

      const res = await resetPasswordHandler(req, {
        params: Promise.resolve({ token: unhasedToken }),
      });
      expect(res.status).toBe(400);

      // Session remains active
      const userInDb = await User.findById(user._id).select("+refreshToken");
      expect(userInDb?.refreshToken).toBe(activeRefreshToken);
    });
  });

  // =========================================================================
  // Defect E: Access-JWT Invalidation on Password Change, Password Reset, and Logout
  // =========================================================================
  describe("Defect E: Access-JWT Invalidation on Password Change, Password Reset, and Logout", () => {
    it("proves a previously issued access token is immediately rejected (401) after password change", async () => {
      const user = await createTestUser();
      const oldAccessToken = await user.generateAccessToken();
      const oldRefreshToken = await user.generateRefreshToken();
      user.refreshToken = oldRefreshToken;
      await user.save();

      // 1. Verify access token works initially
      const initialReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const initialRes = await profileGetHandler(initialReq, emptyContext);
      expect(initialRes.status).toBe(200);

      // 2. Change password
      const changePasswordReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${oldAccessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "InitialPassword123!",
          newPassword: "BrandNewSecurePassword456!",
        }),
      });
      const changeRes = await changePasswordHandler(changePasswordReq, emptyContext);
      expect(changeRes.status).toBe(200);

      // 3. Old access token MUST now fail with 401
      const postChangeReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const postChangeRes = await profileGetHandler(postChangeReq, emptyContext);
      expect(postChangeRes.status).toBe(401);
    });

    it("proves a previously issued access token is immediately rejected (401) after logout", async () => {
      const user = await createTestUser();
      const oldAccessToken = await user.generateAccessToken();
      const oldRefreshToken = await user.generateRefreshToken();
      user.refreshToken = oldRefreshToken;
      await user.save();

      // 1. Verify access token works initially
      const initialReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const initialRes = await profileGetHandler(initialReq, emptyContext);
      expect(initialRes.status).toBe(200);

      // 2. Log out
      const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
          cookie: `${ACCESS_COOKIE_NAME}=${oldAccessToken}; ${REFRESH_COOKIE_NAME}=${oldRefreshToken}`,
        },
      });
      const logoutRes = await logoutHandler(logoutReq, emptyContext);
      expect(logoutRes.status).toBe(200);

      // 3. Old access token MUST now fail with 401
      const postLogoutReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const postLogoutRes = await profileGetHandler(postLogoutReq, emptyContext);
      expect(postLogoutRes.status).toBe(401);
    });

    it("proves a previously issued access token is immediately rejected (401) after password reset", async () => {
      const user = await createTestUser();
      const oldAccessToken = await user.generateAccessToken();
      const oldRefreshToken = await user.generateRefreshToken();
      user.refreshToken = oldRefreshToken;

      const { unhasedToken, hashedToken } = user.generateTemporaryToken(15 * 60 * 1000);
      user.forgotPasswordToken = hashedToken;
      user.forgotPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      // 1. Verify access token works initially
      const initialReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const initialRes = await profileGetHandler(initialReq, emptyContext);
      expect(initialRes.status).toBe(200);

      // 2. Reset password
      const resetReq = new NextRequest(
        `http://localhost:3000/api/auth/reset-password/${unhasedToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: "ResetSecurePassword789!" }),
        }
      );
      const resetRes = await resetPasswordHandler(resetReq, {
        params: Promise.resolve({ token: unhasedToken }),
      });
      expect(resetRes.status).toBe(200);

      // 3. Old access token MUST now fail with 401
      const postResetReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: {
          authorization: `Bearer ${oldAccessToken}`,
        },
      });
      const postResetRes = await profileGetHandler(postResetReq, emptyContext);
      expect(postResetRes.status).toBe(401);
    });

    it("newly authenticated session works and unrelated user session is unaffected", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();

      const userAAccessToken1 = await userA.generateAccessToken();
      const userBAccessToken = await userB.generateAccessToken();

      // Change User A's password
      const changePasswordReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${userAAccessToken1}`,
        },
        body: JSON.stringify({
          oldPassword: "InitialPassword123!",
          newPassword: "BrandNewSecurePassword456!",
        }),
      });
      const changeRes = await changePasswordHandler(changePasswordReq, emptyContext);
      expect(changeRes.status).toBe(200);

      // User A old access token fails
      const userAOldReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${userAAccessToken1}` },
      });
      expect((await profileGetHandler(userAOldReq, emptyContext)).status).toBe(401);

      // User B's access token is completely unaffected
      const userBReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${userBAccessToken}` },
      });
      expect((await profileGetHandler(userBReq, emptyContext)).status).toBe(200);

      // User A logs in with new password and gets a fresh valid session
      const loginReq = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userA.email,
          password: "BrandNewSecurePassword456!",
        }),
      });
      const loginRes = await loginHandler(loginReq, emptyContext);
      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      const freshAccessToken = loginBody.data?.accessToken;
      expect(freshAccessToken).toBeTruthy();

      // Fresh access token works for User A
      const userAFreshReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${freshAccessToken}` },
      });
      expect((await profileGetHandler(userAFreshReq, emptyContext)).status).toBe(200);
    });

    it("proves backward compatibility and immediate revocation for legacy users with no persisted tokenVersion", async () => {
      const accessSecret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);

      // 1. Create a legacy user and physically remove tokenVersion from MongoDB document
      const legacyUser = await createTestUser();
      await User.collection.updateOne(
        { _id: legacyUser._id },
        { $unset: { tokenVersion: "" } }
      );

      // Verify that the document physically lacks tokenVersion in raw BSON
      const rawDoc = await User.collection.findOne({ _id: legacyUser._id });
      expect(rawDoc?.tokenVersion).toBeUndefined();

      // Also create an unrelated control user
      const controlUser = await createTestUser();
      const controlToken = await controlUser.generateAccessToken();

      // 2. Generate a pure legacy JWT with no tokenVersion claim in the payload
      const legacyToken = await new SignJWT({
        userId: legacyUser._id.toString(),
        email: legacyUser.email,
        role: "user",
        hasProfile: false,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(accessSecret);

      // 3. Test that legacy token passes authentication (backward compatibility)
      const initialReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${legacyToken}` },
      });
      const initialRes = await profileGetHandler(initialReq, emptyContext);
      expect(initialRes.status).toBe(200);

      // 4. Change password for legacy user
      const changePasswordReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${legacyToken}`,
        },
        body: JSON.stringify({
          oldPassword: "InitialPassword123!",
          newPassword: "UpdatedLegacyPassword789!",
        }),
      });
      const changeRes = await changePasswordHandler(changePasswordReq, emptyContext);
      expect(changeRes.status).toBe(200);

      // 5. Verify immediate revocation: old legacy token MUST now be rejected with 401
      const postChangeReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${legacyToken}` },
      });
      const postChangeRes = await profileGetHandler(postChangeReq, emptyContext);
      expect(postChangeRes.status).toBe(401);

      // 6. Verify cross-user isolation: control user is unaffected
      const controlReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${controlToken}` },
      });
      expect((await profileGetHandler(controlReq, emptyContext)).status).toBe(200);

      // 7. Verify logout revocation for another legacy user with no initial tokenVersion
      const logoutLegacyUser = await createTestUser();
      await User.collection.updateOne(
        { _id: logoutLegacyUser._id },
        { $unset: { tokenVersion: "" } }
      );
      const logoutLegacyToken = await new SignJWT({
        userId: logoutLegacyUser._id.toString(),
        email: logoutLegacyUser.email,
        role: "user",
        hasProfile: false,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(accessSecret);

      // Verify it works prior to logout
      const preLogoutReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${logoutLegacyToken}` },
      });
      expect((await profileGetHandler(preLogoutReq, emptyContext)).status).toBe(200);

      // Perform logout
      const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${logoutLegacyToken}` },
      });
      const logoutRes = await logoutHandler(logoutReq, emptyContext);
      expect(logoutRes.status).toBe(200);

      // Verify immediate revocation post-logout
      const postLogoutReq = new NextRequest("http://localhost:3000/api/profile", {
        method: "GET",
        headers: { authorization: `Bearer ${logoutLegacyToken}` },
      });
      expect((await profileGetHandler(postLogoutReq, emptyContext)).status).toBe(401);
    });
  });
});
