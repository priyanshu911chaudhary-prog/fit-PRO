"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
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

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workouts", href: "/workout", icon: Dumbbell },
  { name: "Meals", href: "/meal", icon: Utensils },
  { name: "Water", href: "/water", icon: Droplet },
  { name: "BMI & Metrics", href: "/bmi", icon: Scale },
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
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2 group transition-transform hover:scale-[1.02]"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-md shadow-indigo-500/20">
              <Dumbbell className="size-5 text-white transition-transform group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                AI Fitness
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items (when authenticated) */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/15 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className={`size-4 ${item.isAi ? "text-indigo-400" : ""}`} />
                    <span>{item.name}</span>
                    {item.isAi && (
                      <span className="ml-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-1.5 py-0.2 text-[10px] font-bold text-white shadow-xs">
                        AI
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isLoading ? (
            <div className="size-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="desktop-logout-button"
                onClick={() => logout()}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                aria-label="Log Out"
              >
                <LogOut className="size-3.5 mr-1" />
                <span>Log Out</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  id="user-nav-dropdown"
                  className="focus:outline-none rounded-full cursor-pointer select-none"
                  aria-label="User navigation profile menu"
                >
                  <div className="flex items-center gap-2 cursor-pointer p-0.5 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                    <Avatar size="default" className="border border-border">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-semibold text-xs">
                        {getInitials(user.fullName || user.name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate text-foreground">
                      {(user.fullName || user.name || "User").split(" ")[0]}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-foreground leading-none">
                        {user.fullName || user.name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-none truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      id="dropdown-dashboard-button"
                      className="cursor-pointer"
                      onClick={() => router.push("/dashboard")}
                    >
                      <LayoutDashboard className="size-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      id="dropdown-profile-button"
                      className="cursor-pointer"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="size-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      id="dropdown-coach-button"
                      className="cursor-pointer"
                      onClick={() => router.push("/coach")}
                    >
                      <Sparkles className="size-4 mr-2 text-indigo-400" />
                      AI Coach
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    id="dropdown-logout-button"
                    className="cursor-pointer"
                    onClick={() => logout()}
                  >
                    <LogOut className="size-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Sign In
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white border-0 shadow-md shadow-indigo-500/20"
                )}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              id="mobile-menu-toggle"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isAuthenticated && mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="lg:hidden border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className={`size-4 ${item.isAi ? "text-indigo-400" : ""}`} />
                <span>{item.name}</span>
                {item.isAi && (
                  <span className="ml-auto rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5 text-[10px] font-bold">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border/50">
            <button
              type="button"
              id="mobile-logout-button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
