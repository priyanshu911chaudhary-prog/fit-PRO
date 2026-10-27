import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { GET as getQueuesHandler } from "@/app/api/admin/queues/route";
import { NextRequest } from "next/server";
import { signAccessToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

describe("Protected Operational Endpoint: GET /api/admin/queues", () => {
  let ordinaryUser: { _id: mongoose.Types.ObjectId; email: string; token: string };
  let adminUser: { _id: mongoose.Types.ObjectId; email: string; token: string };

  beforeAll(async () => {
    await connectDB();

    process.env.ADMIN_API_KEY = "test_secret_admin_key_12345";

    const testId = Date.now();
    const u1 = await User.create({
      fullName: "Ordinary Athlete",
      email: `ordinary_user_${testId}@fitpro.test`,
      password: "Password123!",
      role: "user",
      isVerified: true,
    });

    const u1Token = await signAccessToken({
      userId: u1._id.toString(),
      email: u1.email,
      role: "user",
    });

    ordinaryUser = { _id: u1._id, email: u1.email, token: u1Token };

    const u2 = await User.create({
      fullName: "Super Admin",
      email: `admin_user_${testId}@fitpro.test`,
      password: "Password123!",
      role: "admin",
      isVerified: true,
    });

    const u2Token = await signAccessToken({
      userId: u2._id.toString(),
      email: u2.email,
      role: "admin",
    });

    adminUser = { _id: u2._id, email: u2.email, token: u2Token };
  });

  afterAll(async () => {
    if (ordinaryUser) {
      await User.deleteOne({ _id: ordinaryUser._id });
    }
    if (adminUser) {
      await User.deleteOne({ _id: adminUser._id });
    }
    await closeQueueConnections();
  });

  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/queues", {
      method: "GET",
    });

    const response = await getQueuesHandler(req, {} as any);
    expect(response.status).toBe(401);
  });

  it("rejects ordinary authenticated users without admin privileges with 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/queues", {
      method: "GET",
      headers: {
        authorization: `Bearer ${ordinaryUser.token}`,
      },
    });

    const response = await getQueuesHandler(req, {} as any);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.statusCode).toBe(403);
    expect(data.message).toContain("Administrator privileges required");
  });

  it("grants access to authorized administrator user with 200 OK and metrics", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/queues", {
      method: "GET",
      headers: {
        authorization: `Bearer ${adminUser.token}`,
      },
    });

    const response = await getQueuesHandler(req, {} as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.statusCode).toBe(200);
    expect(data.data.redis).toBeDefined();
    expect(data.data.queues.email).toBeDefined();
    expect(data.data.queues.leaderboard).toBeDefined();
    expect(data.data.queues.notifications).toBeDefined();
    expect(data.data.outboxes.email).toBeDefined();
    expect(data.data.outboxes.leaderboard).toBeDefined();
    expect(data.data.outboxes.notifications).toBeDefined();
    expect(data.data.schedulers.timezone).toBe("Asia/Kolkata");
    expect(data.data.inspectedBy).toBe(adminUser._id.toString());

    // Verify no secrets or sensitive customer info leaked in payload
    const jsonString = JSON.stringify(data);
    expect(jsonString).not.toContain("password");
    expect(jsonString).not.toContain("refreshToken");
  });

  it("grants access when valid x-admin-key header is supplied", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/queues", {
      method: "GET",
      headers: {
        "x-admin-key": "test_secret_admin_key_12345",
      },
    });

    const response = await getQueuesHandler(req, {} as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.statusCode).toBe(200);
  });
});
