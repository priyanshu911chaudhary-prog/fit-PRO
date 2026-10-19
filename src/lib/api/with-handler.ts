import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "../db";
import { logger } from "../logger";
import { ApiError, createErrorResponse } from "./api-error";

export type RouteHandler<T = unknown> = (
  req: NextRequest,
  context: T
) => Promise<Response | NextResponse>;

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
}

export function withHandler<T = unknown>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (req: NextRequest, context: T): Promise<Response | NextResponse> => {
    const startTime = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      // Connect to MongoDB
      await connectDB();

      // Execute route handler
      const response = await handler(req, context);

      const durationMs = Date.now() - startTime;
      logger.info(`${method} ${path} completed`, {
        requestId,
        method,
        path,
        status: response.status,
        durationMs,
      });

      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      let finalError: unknown = err;

      // Handle Zod validation errors
      if (err instanceof ZodError) {
        const errorMessages = err.issues.map((issue) => {
          const pathPrefix = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
          return `${pathPrefix}${issue.message}`;
        });
        finalError = new ApiError(400, "Validation Failed", errorMessages);
      }
      // Handle MongoDB Duplicate Key (E11000)
      else if ((err as MongoError)?.code === 11000) {
        const mongoErr = err as MongoError;
        const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : "field";
        finalError = new ApiError(400, `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`, [
          `${field} must be unique`,
        ]);
      }

      const { response: errorBody, statusCode } = createErrorResponse(finalError, path, method);

      const logPayload = {
        requestId,
        method,
        path,
        status: statusCode,
        durationMs,
        errors: errorBody.errors,
      };

      if (statusCode >= 500) {
        logger.error(`${method} ${path} server error: ${errorBody.message}`, logPayload);
      } else {
        logger.warn(`${method} ${path} client error: ${errorBody.message}`, logPayload);
      }

      return NextResponse.json(errorBody, {
        status: statusCode,
        headers: {
          "x-request-id": requestId,
        },
      });
    }
  };
}

export default withHandler;
