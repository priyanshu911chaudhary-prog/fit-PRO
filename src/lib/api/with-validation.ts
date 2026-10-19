import { NextRequest } from "next/server";
import { ZodSchema } from "zod";
import { ApiError } from "./api-error";

export async function validateBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON payload in request body");
  }

  return await schema.parseAsync(body);
}

export async function validateQuery<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const searchParams = req.nextUrl.searchParams;
  const queryObj: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    const allValues = searchParams.getAll(key);
    queryObj[key] = allValues.length > 1 ? allValues : value;
  });

  return await schema.parseAsync(queryObj);
}
