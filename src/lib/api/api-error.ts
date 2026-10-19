export class ApiError extends Error {
  statusCode: number;
  data: null;
  success: boolean;
  errors: string[];

  constructor(
    statusCode: number,
    message = "An error occurred",
    errors: string[] = [],
    stack = ""
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export interface ErrorResponseEnvelope {
  statusCode: number;
  message: string;
  data: null;
  success: false;
  errors: string[];
  diagnosticReport?: {
    errorName: string;
    path?: string;
    method?: string;
    stackTrace: string[];
  };
}

export function createErrorResponse(
  error: unknown,
  path?: string,
  method?: string
): { response: ErrorResponseEnvelope; statusCode: number } {
  let statusCode = 500;
  let message = "Something went wrong";
  let errors: string[] = [];
  let errorName = "Error";
  let stack = "";

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors;
    errorName = error.name;
    stack = error.stack || "";
  } else if (error instanceof Error) {
    message = error.message;
    errorName = error.name;
    stack = error.stack || "";

    // Specific error mapping for Mongoose or JWT if uncaught
    if (error.name === "ValidationError") {
      statusCode = 400;
      message = "Validation Error";
    } else if (error.name === "CastError") {
      statusCode = 400;
      message = "Invalid Resource ID";
    } else if (error.name === "JsonWebTokenError" || error.name === "JWTExpired") {
      statusCode = 401;
      message = "Invalid or expired token";
    }
  }

  const isDev = process.env.NODE_ENV !== "production";

  const response: ErrorResponseEnvelope = {
    statusCode,
    message,
    data: null,
    success: false,
    errors,
    ...(isDev && {
      diagnosticReport: {
        errorName,
        path,
        method,
        stackTrace: stack ? stack.split("\n").map((line) => line.trim()) : [],
      },
    }),
  };

  return { response, statusCode };
}

export default ApiError;
