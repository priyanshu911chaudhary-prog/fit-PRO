import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  hasProfile?: boolean;
  tokenVersion?: number;
}

const accessSecret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
const refreshSecret = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  const tokenVersion = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
  return await new SignJWT({ ...payload, tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_EXPIRATION || "7d")
    .sign(accessSecret);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRATION || "30d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    algorithms: ["HS256"],
  });
  return {
    userId: payload.userId as string,
    email: payload.email as string,
    role: (payload.role as string) || "user",
    hasProfile: payload.hasProfile as boolean | undefined,
    tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : undefined,
  };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret, {
    algorithms: ["HS256"],
  });
  return {
    userId: payload.userId as string,
    email: payload.email as string,
  };
}
