import { describe, expect, it } from "vitest";
import { ApiError, createErrorResponse } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";

describe("Showcase: API Tests -> Status Codes, Envelopes & Permissions", () => {
  describe("ApiResponse Envelope Standardization", () => {
    it("formats 200 OK responses with required contract { statusCode, success: true, message, data }", () => {
      const payload = { workoutId: "wk_101", name: "Hypertrophy Push" };
      const res = new ApiResponse(200, "Workout retrieved successfully", payload);

      expect(res.statusCode).toBe(200);
      expect(res.success).toBe(true);
      expect(res.message).toBe("Workout retrieved successfully");
      expect(res.data).toEqual(payload);
    });

    it("formats 201 Created responses with success: true", () => {
      const res = new ApiResponse(201, "Meal logged successfully", { logId: "meal_202" });
      expect(res.statusCode).toBe(201);
      expect(res.success).toBe(true);
      expect(res.data.logId).toBe("meal_202");
    });
  });

  describe("ApiError Envelope & HTTP Status Code Mapping", () => {
    it("maps 400 Bad Request with field validation error list", () => {
      const error = new ApiError(400, "Validation Failed", [
        "Email address is invalid",
        "Password must be at least 8 characters",
      ]);
      const { response, statusCode } = createErrorResponse(error, "/api/auth/register", "POST");

      expect(statusCode).toBe(400);
      expect(response.statusCode).toBe(400);
      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.message).toBe("Validation Failed");
      expect(response.errors).toHaveLength(2);
      expect(response.errors).toContain("Email address is invalid");
    });

    it("maps 401 Unauthorized for expired or missing tokens", () => {
      const error = new ApiError(401, "Unauthorized access", ["Token has expired"]);
      const { response, statusCode } = createErrorResponse(error, "/api/dashboard", "GET");

      expect(statusCode).toBe(401);
      expect(response.statusCode).toBe(401);
      expect(response.success).toBe(false);
      expect(response.message).toBe("Unauthorized access");
    });

    it("maps 403 Forbidden for insufficient permissions", () => {
      const error = new ApiError(403, "Forbidden resource", ["You do not own this workout plan"]);
      const { response, statusCode } = createErrorResponse(error, "/api/workout/wk_999", "DELETE");

      expect(statusCode).toBe(403);
      expect(response.statusCode).toBe(403);
      expect(response.success).toBe(false);
    });

    it("maps 404 Not Found for missing entities", () => {
      const error = new ApiError(404, "User profile not found");
      const { response, statusCode } = createErrorResponse(error, "/api/profile", "GET");

      expect(statusCode).toBe(404);
      expect(response.statusCode).toBe(404);
      expect(response.success).toBe(false);
    });

    it("maps 429 Too Many Requests with retry notice", () => {
      const error = new ApiError(429, "Too many requests. Please slow down.");
      const { response, statusCode } = createErrorResponse(error, "/api/auth/login", "POST");

      expect(statusCode).toBe(429);
      expect(response.statusCode).toBe(429);
      expect(response.success).toBe(false);
    });

    it("safely catches unhandled runtime exceptions and returns sanitized 500 error", () => {
      const unhandled = new Error("Database network socket closed unexpectedly");
      const { response, statusCode } = createErrorResponse(unhandled, "/api/coach", "POST");

      expect(statusCode).toBe(500);
      expect(response.statusCode).toBe(500);
      expect(response.success).toBe(false);
      expect(response.message).toBe("Database network socket closed unexpectedly");
      expect(response.data).toBeNull();
    });
  });
});
