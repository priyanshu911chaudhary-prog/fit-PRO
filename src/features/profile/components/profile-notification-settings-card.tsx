"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Clock,
  Moon,
  Globe,
  Mail,
  Smartphone,
  Save,
  Loader2,
  Droplet,
  Dumbbell,
  Utensils,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

interface NotificationPreferencesState {
  timezone: string;
  proactiveNudgesEnabled: boolean;
  achievementsEnabled: boolean;
  categories: {
    hydration: boolean;
    workout: boolean;
    nutrition: boolean;
  };
  checkInTime: string;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

export function ProfileNotificationSettingsCard() {
  const [prefs, setPrefs] = useState<NotificationPreferencesState>({
    timezone: "Asia/Kolkata",
    proactiveNudgesEnabled: false,
    achievementsEnabled: true,
    categories: { hydration: true, workout: true, nutrition: true },
    checkInTime: "18:00",
    channels: { inApp: true, email: false, push: false },
    quietHours: { enabled: true, start: "21:00", end: "08:00" },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch("/api/notifications/preferences");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPrefs(json.data);
          }
        }
      } catch {
        // Fall back to defaults
      } finally {
        setIsLoading(false);
      }
    }

    void loadPreferences();
  }, []);

  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setPrefs((p) => ({ ...p, timezone: detected }));
        toast.success(`Timezone detected: ${detected}`);
      }
    } catch {
      toast.error("Could not detect local timezone");
    }
  };

  const handleTogglePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Browser push notifications are not supported on this device/browser");
      return;
    }

    setIsPushLoading(true);

    try {
      if (!prefs.channels.push) {
        // Enable Push: Request permission explicitly on user click
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          toast.error("Notification permission denied in browser");
          setIsPushLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // Resolve VAPID Public Key from env or fetch from server endpoint
        let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          try {
            const keyRes = await fetch("/api/notifications/push/subscribe");
            if (keyRes.ok) {
              const keyJson = await keyRes.json();
              vapidPublicKey = keyJson?.data?.publicKey;
            }
          } catch {
            // ignore network error
          }
        }

        if (!vapidPublicKey) {
          toast.error("Web Push is not configured on the server (missing VAPID public key)");
          setIsPushLoading(false);
          return;
        }

        const subOptions: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        };

        let subscription: globalThis.PushSubscription | null = null;
        try {
          subscription = await registration.pushManager.subscribe(subOptions);
        } catch (subErr) {
          // If browser already has an existing subscription with an old or mismatched key, unsubscribe and retry
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            await existing.unsubscribe();
            subscription = await registration.pushManager.subscribe(subOptions);
          } else {
            throw subErr;
          }
        }

        const subJson = subscription.toJSON();
        const subscribeRes = await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh || "mock-p256dh",
              auth: subJson.keys?.auth || "mock-auth",
            },
          }),
        });

        if (subscribeRes.ok) {
          setPrefs((p) => ({
            ...p,
            channels: { ...p.channels, push: true },
          }));
          toast.success("Browser push notifications enabled!");
        } else {
          toast.error("Failed to register push subscription on server");
        }
      } else {
        // Disable Push
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await fetch("/api/notifications/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            }).catch(() => {});
            await subscription.unsubscribe();
          }
        }

        setPrefs((p) => ({
          ...p,
          channels: { ...p.channels, push: false },
        }));
        toast.info("Browser push notifications disabled");
      }
    } catch (err) {
      toast.error(`Push subscription error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        toast.success("Notification preferences saved successfully!");
      } else {
        const errorJson = await res.json().catch(() => ({}));
        toast.error(errorJson.message || "Failed to save preferences");
      }
    } catch {
      toast.error("Network error saving preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card id="notifications" className="border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 text-emerald-400 animate-spin" />
          <span className="text-xs font-mono text-muted-foreground">Loading notification settings...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card id="notifications" className="border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl shadow-xl overflow-hidden">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Bell className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold font-heading text-foreground">
                Smart Fitness Nudges & Reminders
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Personalized, non-judgmental habit nudges powered by BullMQ background evaluation.
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-xs"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Settings
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Master Switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-card/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                Proactive Daily Check-In
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Receive at most one personalized reminder per day at your scheduled time if you are behind on hydration, workout, or nutrition.
              </p>
            </div>
            <input
              type="checkbox"
              id="proactive-toggle"
              checked={prefs.proactiveNudgesEnabled}
              onChange={(e) => setPrefs({ ...prefs, proactiveNudgesEnabled: e.target.checked })}
              className="mt-1 size-4 rounded border-border/80 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-card/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                Activity Milestone Achievements
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Celebrate hitting your daily water target, protein goal, or logging a qualifying workout.
              </p>
            </div>
            <input
              type="checkbox"
              id="achievements-toggle"
              checked={prefs.achievementsEnabled}
              onChange={(e) => setPrefs({ ...prefs, achievementsEnabled: e.target.checked })}
              className="mt-1 size-4 rounded border-border/80 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            Nudge Categories
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-card/40 cursor-pointer hover:border-border transition-colors">
              <input
                type="checkbox"
                checked={prefs.categories.hydration}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    categories: { ...prefs.categories, hydration: e.target.checked },
                  })
                }
                className="size-3.5 rounded border-border accent-emerald-500 cursor-pointer"
              />
              <Droplet className="size-4 text-cyan-400" />
              <span className="text-xs font-medium text-foreground">Hydration</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-card/40 cursor-pointer hover:border-border transition-colors">
              <input
                type="checkbox"
                checked={prefs.categories.workout}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    categories: { ...prefs.categories, workout: e.target.checked },
                  })
                }
                className="size-3.5 rounded border-border accent-emerald-500 cursor-pointer"
              />
              <Dumbbell className="size-4 text-amber-400" />
              <span className="text-xs font-medium text-foreground">Workouts</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-card/40 cursor-pointer hover:border-border transition-colors">
              <input
                type="checkbox"
                checked={prefs.categories.nutrition}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    categories: { ...prefs.categories, nutrition: e.target.checked },
                  })
                }
                className="size-3.5 rounded border-border accent-emerald-500 cursor-pointer"
              />
              <Utensils className="size-4 text-emerald-400" />
              <span className="text-xs font-medium text-foreground">Nutrition & Protein</span>
            </label>
          </div>
        </div>

        {/* Schedule & Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              Daily Check-In Time
            </label>
            <input
              type="time"
              value={prefs.checkInTime}
              onChange={(e) => setPrefs({ ...prefs, checkInTime: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-border/70 bg-card text-xs text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-muted-foreground">Default is 18:00 (6:00 PM) in your local timezone.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                Local Timezone
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Auto-detect
              </button>
            </div>
            <select
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-border/70 bg-card text-xs text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {!COMMON_TIMEZONES.includes(prefs.timezone) && (
                <option value={prefs.timezone}>{prefs.timezone}</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="size-4 text-indigo-400" />
              <span className="text-xs font-bold text-foreground">Quiet Hours</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.quietHours.enabled}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  quietHours: { ...prefs.quietHours, enabled: e.target.checked },
                })
              }
              className="size-4 rounded border-border accent-emerald-500 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            No external push or email notifications will be sent during your quiet hours.
          </p>
          {prefs.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Quiet Start (Sleep)</span>
                <input
                  type="time"
                  value={prefs.quietHours.start}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, start: e.target.value },
                    })
                  }
                  className="w-full h-8 px-2 rounded-md border border-border/70 bg-card text-xs text-foreground"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Quiet End (Wake)</span>
                <input
                  type="time"
                  value={prefs.quietHours.end}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, end: e.target.value },
                    })
                  }
                  className="w-full h-8 px-2 rounded-md border border-border/70 bg-card text-xs text-foreground"
                />
              </div>
            </div>
          )}
        </div>

        {/* Delivery Channels */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            Delivery Channels (Opt-in)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* In-app channel */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="size-3.5 text-emerald-400" />
                  In-App Notification Center
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Persistent notification center in the navigation header.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.channels.inApp}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    channels: { ...prefs.channels, inApp: e.target.checked },
                  })
                }
                className="size-4 rounded border-border accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Email channel */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-cyan-400" />
                  Wellness Emails
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Optional reminder emails sent to your registered address.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.channels.email}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    channels: { ...prefs.channels, email: e.target.checked },
                  })
                }
                className="size-4 rounded border-border accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Push channel */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col justify-between space-y-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Smartphone className="size-3.5 text-amber-400" />
                    Browser Web Push
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      prefs.channels.push
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {prefs.channels.push ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Timely desktop or mobile web push alerts.
                </p>
              </div>
              <Button
                type="button"
                variant={prefs.channels.push ? "destructive" : "outline"}
                size="sm"
                onClick={handleTogglePush}
                disabled={isPushLoading}
                className="h-7 text-xs w-full"
              >
                {isPushLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : prefs.channels.push ? (
                  "Disable Push"
                ) : (
                  "Enable Browser Push"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/40 bg-muted/10 flex items-start gap-2.5 text-[11px] text-muted-foreground">
          <Info className="size-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            External channels (Email and Browser Push) strictly respect your quiet hours and are capped at a maximum of 2 external nudges per day to prevent spam.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
