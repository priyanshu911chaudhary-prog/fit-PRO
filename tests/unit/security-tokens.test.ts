import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies";

describe("Showcase: Unit Tests -> Security & Auth Token Management", () => {
  const mockUserPayload = {
    userId: "660c2b5f7e6f8a001a1b2c3d",
    email: "athlete@fitpro.dev",
  };

  describe("JWT HS256 Token Lifecycle (jose)", () => {
    it("successfully signs and verifies a valid access token", async () => {
      const token = await signAccessToken(mockUserPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Header.Payload.Signature

      const decoded = await verifyAccessToken(token);
      expect(decoded.userId).toBe(mockUserPayload.userId);
      expect(decoded.email).toBe(mockUserPayload.email);
    });

    it("successfully signs and verifies a valid refresh token", async () => {
      const token = await signRefreshToken(mockUserPayload);
      expect(typeof token).toBe("string");

      const decoded = await verifyRefreshToken(token);
      expect(decoded.userId).toBe(mockUserPayload.userId);
      expect(decoded.email).toBe(mockUserPayload.email);
    });

    it("rejects tampered tokens with invalid cryptographic signatures", async () => {
      const validToken = await signAccessToken(mockUserPayload);
      const tamperedToken = validToken.slice(0, -6) + "abcdef";

      await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
    });

    it("enforces cryptographic key separation (access vs refresh secrets)", async () => {
      // Attempting to verify an Access Token with the Refresh Secret must fail
      const accessToken = await signAccessToken(mockUserPayload);
      await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
    });
  });

  describe("HttpOnly Session Cookie Security Flags", () => {
    it("sets HttpOnly, SameSite, and scoped paths for auth cookies", () => {
      const response = NextResponse.json({ success: true });
      setAuthCookies(response, "mock-access-token", "mock-refresh-token");

      const accessCookie = response.cookies.get(ACCESS_COOKIE_NAME);
      const refreshCookie = response.cookies.get(REFRESH_COOKIE_NAME);

      expect(accessCookie).toBeDefined();
      expect(accessCookie?.value).toBe("mock-access-token");
      expect(accessCookie?.httpOnly).toBe(true);
      expect(String(accessCookie?.sameSite).toLowerCase()).toBe("lax");
      expect(accessCookie?.path).toBe("/");
      expect(accessCookie?.maxAge).toBe(ACCESS_COOKIE_MAX_AGE);

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.value).toBe("mock-refresh-token");
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.path).toBe("/api/auth");
      expect(refreshCookie?.maxAge).toBe(REFRESH_COOKIE_MAX_AGE);
    });

    it("clears cookies immediately with maxAge: 0 upon logout", () => {
      const response = NextResponse.json({ success: true });
      clearAuthCookies(response);

      const accessCookie = response.cookies.get(ACCESS_COOKIE_NAME);
      const refreshCookie = response.cookies.get(REFRESH_COOKIE_NAME);

      expect(accessCookie?.maxAge).toBe(0);
      expect(accessCookie?.value).toBe("");
      expect(refreshCookie?.maxAge).toBe(0);
      expect(refreshCookie?.value).toBe("");
    });
  });
});
