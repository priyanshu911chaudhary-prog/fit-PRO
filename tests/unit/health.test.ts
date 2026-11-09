import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

describe("Health Check API (/api/health)", () => {
  it("returns 200 with service states when database is connected", async () => {
    // Mock mongoose connected state
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 1,
      configurable: true,
    });

    const req = new NextRequest("http://localhost:3000/api/health");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(["healthy", "degraded"]).toContain(data.status);
    expect(data.services.database).toBe("connected");
    expect(data.uptime).toBeTypeOf("number");
    expect(data.timestamp).toBeDefined();

    Object.defineProperty(mongoose.connection, "readyState", {
      value: originalReadyState,
      configurable: true,
    });
  });

  it("returns 503 unhealthy when database cannot connect", async () => {
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });

    // Mock connectDB failure
    const dbModule = await import("@/lib/db");
    const connectSpy = vi.spyOn(dbModule, "connectDB").mockRejectedValueOnce(new Error("DB Down"));

    const req = new NextRequest("http://localhost:3000/api/health");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.services.database).toBe("disconnected");

    connectSpy.mockRestore();
    Object.defineProperty(mongoose.connection, "readyState", {
      value: originalReadyState,
      configurable: true,
    });
  });
});

