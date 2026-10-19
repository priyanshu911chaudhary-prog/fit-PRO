import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export interface TokenPayload {
  userId: string;
  email: string;
}

const accessSecret = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
const refreshSecret = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_EXPIRATION || "15m")
    .sign(accessSecret);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRATION || "7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    algorithms: ["HS256"],
  });
  return {
    userId: payload.userId as string,
    email: payload.email as string,
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
