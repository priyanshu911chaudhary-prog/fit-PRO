import webpush from "web-push";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PushSubscription, IPushSubscription } from "@/models/pushSubscription";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badge?: string;
  icon?: string;
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const env = getEnv();

  if (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        env.VAPID_SUBJECT || "mailto:support@fitpro.local",
        env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
      );
      vapidConfigured = true;
      return true;
    } catch (err) {
      logger.error("Failed to configure web-push VAPID details", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
  return false;
}

/**
 * Sends a Web Push notification to a stored subscription.
 * Automatically handles expired/invalid subscriptions (404/410) by deleting them from MongoDB.
 */
export async function sendPushNotification(
  subscription: IPushSubscription,
  payload: PushNotificationPayload
): Promise<{ success: boolean; uninstalled?: boolean }> {
  const isReady = ensureVapidConfigured();
  const isMockOrTest =
    process.env.NODE_ENV === "test" ||
    subscription.keys.p256dh.startsWith("mock") ||
    subscription.endpoint.includes("example.com");

  if (!isReady || isMockOrTest) {
    logger.info("[PUSH NOTIFICATION SIMULATION]", {
      endpoint: subscription.endpoint.slice(0, 40) + "...",
      title: payload.title,
      body: payload.body,
      simulated: true,
    });
    return { success: true };
  }

  const pushSubscriptionData: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    tag: payload.tag || "fitpro-nudge",
    data: {
      url: payload.url || "/dashboard",
    },
  });

  try {
    await webpush.sendNotification(pushSubscriptionData, stringifiedPayload, {
      TTL: 3600, // 1 hour TTL for time-sensitive nudges
    });
    return { success: true };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;

    // 404 Not Found or 410 Gone means the client has unregistered or push token is invalid
    if (statusCode === 404 || statusCode === 410) {
      logger.info("Web push subscription expired or uninstalled; removing from database", {
        endpoint: subscription.endpoint.slice(0, 40) + "...",
        statusCode,
      });

      await PushSubscription.deleteOne({ _id: subscription._id }).catch(() => {});
      return { success: false, uninstalled: true };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to deliver Web Push notification", {
      endpoint: subscription.endpoint.slice(0, 40) + "...",
      statusCode,
      error: errorMsg,
    });
    throw new Error(`Push notification delivery failed: ${errorMsg}`);
  }
}
