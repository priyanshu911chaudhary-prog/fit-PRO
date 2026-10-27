import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { User } from "@/models/user";
import { Notification } from "@/models/notification";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { PushSubscription } from "@/models/pushSubscription";
import { signAccessToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

import { GET as getNotificationsHandler } from "@/app/api/notifications/route";
import { PATCH as updateNotificationHandler } from "@/app/api/notifications/[id]/route";
import { PATCH as readAllNotificationsHandler } from "@/app/api/notifications/read-all/route";
import {
  GET as getPreferencesHandler,
  PATCH as updatePreferencesHandler,
} from "@/app/api/notifications/preferences/route";
import {
  GET as getPushKeyHandler,
  POST as subscribePushHandler,
  DELETE as unsubscribePushHandler,
} from "@/app/api/notifications/push/subscribe/route";

describe("Notifications and Push Subscription APIs", () => {
  let testUser: { _id: mongoose.Types.ObjectId; email: string; token: string };

  beforeAll(async () => {
    await connectDB();

    const u = await User.create({
      fullName: "Notification API Tester",
      email: `notif_api_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });

    const token = await signAccessToken({
      userId: u._id.toString(),
      email: u.email,
    });

    testUser = { _id: u._id, email: u.email, token };
  });

  afterAll(async () => {
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
      await Notification.deleteMany({ user: testUser._id });
      await NotificationPreferences.deleteOne({ user: testUser._id });
      await PushSubscription.deleteMany({ user: testUser._id });
    }
    await closeQueueConnections();
  });

  it("GET /api/notifications rejects unauthenticated requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications", { method: "GET" });
    const res = await getNotificationsHandler(req, {} as any);
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications returns list, unread count, and pagination", async () => {
    // Seed 2 notifications
    await Notification.create([
      {
        user: testUser._id,
        type: "hydration_nudge",
        category: "hydration",
        title: "Water Check",
        body: "Drink more water",
        destinationUrl: "/water",
        readAt: null,
      },
      {
        user: testUser._id,
        type: "workout_nudge",
        category: "workout",
        title: "Workout Day",
        body: "Time for gym",
        destinationUrl: "/workout",
        readAt: new Date(),
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/notifications?page=1&limit=10", {
      method: "GET",
      headers: { authorization: `Bearer ${testUser.token}` },
    });

    const res = await getNotificationsHandler(req, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.notifications.length).toBeGreaterThanOrEqual(2);
    expect(json.data.unreadCount).toBeGreaterThanOrEqual(1);
    expect(json.data.pagination.page).toBe(1);
  });

  it("PATCH /api/notifications/[id] marks notification as read and clicked", async () => {
    const notif = await Notification.create({
      user: testUser._id,
      type: "custom",
      category: "general",
      title: "Click Test",
      body: "Testing click updates",
      destinationUrl: "/dashboard",
      readAt: null,
    });

    const req = new NextRequest(`http://localhost:3000/api/notifications/${notif._id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${testUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clicked: true }),
    });

    const res = await updateNotificationHandler(req, {
      params: Promise.resolve({ id: notif._id.toString() }),
    } as any);
    expect(res.status).toBe(200);

    const updated = await Notification.findById(notif._id);
    expect(updated?.readAt).not.toBeNull();
    expect(updated?.clickedAt).not.toBeNull();
  });

  it("PATCH /api/notifications/read-all marks all unread items as read", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications/read-all", {
      method: "PATCH",
      headers: { authorization: `Bearer ${testUser.token}` },
    });

    const res = await readAllNotificationsHandler(req, {} as any);
    expect(res.status).toBe(200);

    const unreadCount = await Notification.countDocuments({
      user: testUser._id,
      readAt: null,
    });
    expect(unreadCount).toBe(0);
  });

  it("GET and PATCH /api/notifications/preferences manages settings with validation", async () => {
    // 1. GET preferences
    const getReq = new NextRequest("http://localhost:3000/api/notifications/preferences", {
      method: "GET",
      headers: { authorization: `Bearer ${testUser.token}` },
    });
    const getRes = await getPreferencesHandler(getReq, {} as any);
    expect(getRes.status).toBe(200);

    // 2. PATCH invalid timezone -> 400
    const badPatchReq = new NextRequest("http://localhost:3000/api/notifications/preferences", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${testUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timezone: "Invalid/Timezone" }),
    });
    const badPatchRes = await updatePreferencesHandler(badPatchReq, {} as any);
    expect(badPatchRes.status).toBe(400);

    // 3. PATCH valid settings
    const goodPatchReq = new NextRequest("http://localhost:3000/api/notifications/preferences", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${testUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timezone: "America/New_York",
        proactiveNudgesEnabled: true,
        checkInTime: "19:30",
        categories: { hydration: true, workout: false },
        quietHours: { enabled: true, start: "22:00", end: "07:00" },
      }),
    });
    const goodPatchRes = await updatePreferencesHandler(goodPatchReq, {} as any);
    expect(goodPatchRes.status).toBe(200);

    const updatedJson = await goodPatchRes.json();
    expect(updatedJson.data.timezone).toBe("America/New_York");
    expect(updatedJson.data.proactiveNudgesEnabled).toBe(true);
    expect(updatedJson.data.checkInTime).toBe("19:30");
    expect(updatedJson.data.categories.workout).toBe(false);
  });

  it("POST and DELETE /api/notifications/push/subscribe registers and removes subscriptions", async () => {
    const endpoint = `https://fcm.googleapis.com/fcm/send/api-test-${Date.now()}`;

    // 1. Subscribe
    const subReq = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
      method: "POST",
      headers: {
        authorization: `Bearer ${testUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        keys: {
          p256dh: "BM123mockP256dhKey",
          auth: "mockAuthSecret123",
        },
      }),
    });

    const subRes = await subscribePushHandler(subReq, {} as any);
    expect(subRes.status).toBe(200);

    const saved = await PushSubscription.findOne({ endpoint });
    expect(saved).not.toBeNull();
    expect(saved?.user.toString()).toBe(testUser._id.toString());

    // 2. Unsubscribe
    const unsubReq = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${testUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });

    const unsubRes = await unsubscribePushHandler(unsubReq, {} as any);
    expect(unsubRes.status).toBe(200);

    const deleted = await PushSubscription.findOne({ endpoint });
    expect(deleted).toBeNull();
  });

  it("GET /api/notifications/push/subscribe returns the public VAPID key", async () => {
    const req = new NextRequest("http://localhost:3000/api/notifications/push/subscribe", {
      method: "GET",
    });

    const res = await getPushKeyHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.publicKey).toBe("string");
    expect(body.data.publicKey.length).toBeGreaterThan(10);
  });
});
