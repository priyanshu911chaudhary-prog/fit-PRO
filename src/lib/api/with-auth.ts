import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/user";
import { ACCESS_COOKIE_NAME } from "../auth/cookies";
import { TokenPayload, verifyAccessToken } from "../auth/jwt";
import { ApiError } from "./api-error";

export interface AuthenticatedRequest extends NextRequest {
  user: TokenPayload;
}

export type AuthenticatedRouteHandler<T = unknown> = (
  req: NextRequest,
  context: T,
  user: TokenPayload
) => Promise<Response | NextResponse>;

export function withAuth<T = unknown>(
  handler: AuthenticatedRouteHandler<T>
): (req: NextRequest, context: T) => Promise<Response | NextResponse> {
  return async (req: NextRequest, context: T): Promise<Response | NextResponse> => {
    const cookieToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;

    const token = cookieToken || bearerToken;

    if (!token) {
      throw new ApiError(401, "Access token is missing");
    }

    let user: TokenPayload;
    try {
      user = await verifyAccessToken(token);
    } catch {
      throw new ApiError(401, "Invalid or expired access token");
    }

    const dbUser = await User.findById(user.userId).select("tokenVersion").lean();
    if (!dbUser || (dbUser.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new ApiError(401, "Invalid or expired access token");
    }

    return await handler(req, context, user);
  };
}

export function withOptionalAuth<T = unknown>(
  handler: (req: NextRequest, context: T, user: TokenPayload | null) => Promise<Response | NextResponse>
): (req: NextRequest, context: T) => Promise<Response | NextResponse> {
  return async (req: NextRequest, context: T): Promise<Response | NextResponse> => {
    const cookieToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : null;

    const token = cookieToken || bearerToken;

    let user: TokenPayload | null = null;
    if (token) {
      try {
        user = await verifyAccessToken(token);
        const dbUser = await User.findById(user.userId).select("tokenVersion").lean();
        if (!dbUser || (dbUser.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
          user = null;
        }
      } catch {
        user = null;
      }
    }

    return await handler(req, context, user);
  };
}
