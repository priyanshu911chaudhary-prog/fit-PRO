import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { isRedisReady, ensureRedisConnected } from "@/lib/redis/client";
import { logger } from "@/lib/logger";

export async function GET() {
  let dbStatus = "disconnected";
  let redisStatus = "disconnected";

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    dbStatus = mongoose.connection.readyState === 1 ? "connected" : "connecting";
  } catch (error) {
    logger.warn("Healthcheck database probe failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    dbStatus = "disconnected";
  }

  try {
    const ready = isRedisReady() || (await ensureRedisConnected());
    redisStatus = ready ? "connected" : "disconnected";
  } catch (error) {
    logger.warn("Healthcheck redis probe failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    redisStatus = "disconnected";
  }

  const isHealthy = dbStatus === "connected";
  const status = isHealthy
    ? redisStatus === "connected"
      ? "healthy"
      : "degraded"
    : "unhealthy";

  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: {
        database: dbStatus,
        cache: redisStatus,
      },
    },
    { status: statusCode }
  );
}

