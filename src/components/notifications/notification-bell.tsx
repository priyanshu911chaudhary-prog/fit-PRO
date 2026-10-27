"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Droplet,
  Dumbbell,
  Utensils,
  Sparkles,
  Settings,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export interface NotificationItem {
  _id: string;
  type: string;
  category: "hydration" | "workout" | "nutrition" | "general";
  title: string;
  body: string;
  destinationUrl: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications?limit=10");
        if (!res.ok || !active) return;
        const json = await res.json();
        if (json.success && json.data && active) {
          setNotifications(json.data.notifications || []);
          setUnreadCount(json.data.unreadCount || 0);
        }
      } catch {
        // Quiet fallback
      }
    };

    void load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
      }
    } catch {
      // Quiet fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    // Optimistically mark as read
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    if (!item.readAt) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      void fetch(`/api/notifications/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clicked: true }),
      });
    } catch {
      // Quiet fallback
    }

    setIsOpen(false);
    if (item.destinationUrl) {
      router.push(item.destinationUrl);
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recent";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "hydration":
        return <Droplet className="size-3.5 text-cyan-400 shrink-0" />;
      case "workout":
        return <Dumbbell className="size-3.5 text-amber-400 shrink-0" />;
      case "nutrition":
        return <Utensils className="size-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Sparkles className="size-3.5 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative flex size-8 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-all duration-200 hover:border-emerald-500/50 hover:text-foreground hover:shadow-xs",
          isOpen && "border-emerald-500/50 text-foreground ring-1 ring-emerald-500/30"
        )}
        aria-label="Open notifications center"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black shadow-xs shadow-emerald-500/50 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-2xl border-border/80 bg-card/95 backdrop-blur-xl overflow-hidden"
      >
        <DropdownMenuLabel className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-emerald-400" />
            <span className="text-xs font-bold text-foreground font-heading">
              Notifications & Nudges
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Sparkles className="size-8 text-emerald-400/40" />
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                Log your meals, workouts, and water to receive personalized smart fitness nudges.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  "p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/40",
                  !item.readAt && "bg-emerald-500/5 hover:bg-emerald-500/10"
                )}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-card border border-border/60 shadow-xs">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight truncate",
                        !item.readAt ? "text-foreground font-bold" : "text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground/80">
                      <Clock className="size-2.5" />
                      {formatNotificationTime(item.createdAt)}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>
                {!item.readAt && (
                  <span className="size-2 rounded-full bg-emerald-400 shrink-0 mt-1.5 shadow-xs shadow-emerald-400/50" />
                )}
              </div>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            router.push("/profile#notifications");
          }}
          className="p-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 bg-muted/10 font-medium"
        >
          <Settings className="size-3.5" />
          <span>Notification & Reminder Preferences</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
