"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Sparkles,
  Menu,
  X,
  Utensils,
  Droplet,
  Scale,
  CalendarCheck,
  Bot,
  User,
  LogOut,
  LayoutDashboard,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Workouts", href: "/workout", icon: Dumbbell },
  { name: "Meals", href: "/meal", icon: Utensils },
  { name: "Water", href: "/water", icon: Droplet },
  { name: "Biometrics", href: "/bmi", icon: Scale },
  { name: "Plans", href: "/plans", icon: CalendarCheck },
  { name: "AI Coach", href: "/coach", icon: Bot, isAi: true },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-3 z-50 w-full px-4 sm:px-6 pointer-events-none">
      <div className="container mx-auto max-w-6xl pointer-events-auto">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4 rounded-2xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 transition-all">
          {/* Brand Identity */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-card border border-border/80 text-emerald-400 shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:border-emerald-500/50 group-hover:shadow-emerald-500/10">
              <FitProLogo size={20} />
            </div>
            <div className="flex items-center">
              <span className="font-heading text-base font-black tracking-tight text-foreground group-hover:text-emerald-400 transition-colors">
                fit-PRO
              </span>
            </div>
          </Link>

          {/* Center: Sliding Pill Navigation for Authenticated Users */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1 relative">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 select-none border",
                      isActive
                        ? "text-emerald-400 font-bold border-emerald-500/30 bg-emerald-500/10 shadow-xs"
                        : "border-transparent text-muted-foreground/80 hover:text-foreground hover:bg-foreground/5 hover:border-border/60 hover:shadow-xs"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/30 rounded-xl -z-10 shadow-xs shadow-emerald-500/10"
                      />
                    )}
                    <item.icon className={cn("size-3.5", item.isAi ? "text-emerald-400" : "")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Controls: Theme + User / Sign In */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {isLoading ? (
              <div className="size-8 rounded-full bg-muted/60 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="user-nav-dropdown"
                    className="focus:outline-none rounded-full cursor-pointer select-none"
                    aria-label="User profile menu"
                  >
                    <div className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary/30 transition-all">
                      <Avatar size="sm" className="size-7 border border-border/80">
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                          {getInitials(user.fullName || user.name || "User")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-xs font-medium max-w-[100px] truncate text-foreground">
                        {(user.fullName || user.name || "Athlete").split(" ")[0]}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-border/80">
                    <DropdownMenuLabel className="font-normal p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-xs font-bold text-foreground leading-none">
                          {user.fullName || user.name || "Athlete"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-none truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => router.push("/dashboard")}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <LayoutDashboard className="size-3.5" />
                        <span>Command Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/profile")}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <User className="size-3.5" />
                        <span>Profile & Biometrics</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2"
                    >
                      <LogOut className="size-3.5" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "sm", variant: "ghost" }),
                    "text-xs font-semibold h-8 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:border-border/80 border border-transparent transition-all duration-150"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "text-xs font-bold h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-emerald-500/20 border border-emerald-400/20 transition-all duration-150"
                  )}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden mt-2 p-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl space-y-1"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.isAi && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400">
                        AI
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 p-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
