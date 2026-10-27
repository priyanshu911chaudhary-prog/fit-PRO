import { SignJWT, jwtVerify } from "jose";

const UNUSBSCRIBE_SECRET = new TextEncoder().encode(
  (process.env.ACCESS_TOKEN_SECRET || "fitpro_default_access_secret_32chars!") + "_unsubscribe"
);
const TOKEN_EXPIRATION = "30d";

export interface UnsubscribeTokenPayload {
  userId: string;
  scope: "wellness_email_unsubscribe";
}

/**
 * Generates an HMAC-signed, scoped, time-expiring token for unauthenticated wellness email unsubscribe.
 * Does not expose raw database IDs in query strings without signature protection.
 */
export async function generateUnsubscribeToken(userId: string): Promise<string> {
  return await new SignJWT({
    userId,
    scope: "wellness_email_unsubscribe",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(UNUSBSCRIBE_SECRET);
}

/**
 * Verifies an unsubscribe token.
 * Returns the userId if valid and not expired, or null if tampered, malformed, or expired.
 * Never leaks internal details or throws unhandled errors.
 */
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, UNUSBSCRIBE_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      payload.scope !== "wellness_email_unsubscribe" ||
      typeof payload.userId !== "string" ||
      !payload.userId
    ) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}
