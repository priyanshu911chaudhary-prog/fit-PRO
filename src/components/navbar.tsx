"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarCheck, Droplet, Dumbbell, LayoutDashboard, Menu, Scale, Trophy, User, Utensils } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Workouts", href: "/workout", icon: Dumbbell },
  { name: "Meals", href: "/meal", icon: Utensils },
  { name: "Water", href: "/water", icon: Droplet },
  { name: "Biometrics", href: "/bmi", icon: Scale },
  { name: "Plans", href: "/plans", icon: CalendarCheck },
  { name: "AI Coach", href: "/coach", icon: Bot },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = [...NAV_ITEMS, { name: "Profile", href: "/profile", icon: User }];

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="nav-frame">
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="wordmark" aria-label="fit-PRO home">
          <FitProLogo size={32} />fit-PRO
        </Link>
        {isAuthenticated && <nav aria-label="Main navigation" className="desktop-nav">
          {NAV_ITEMS.map(({ name, href }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{name}</Link>
          ))}
        </nav>}
        <div className="nav-actions">
          <ThemeToggle />
          {isAuthenticated && user ? <>
            <NotificationBell />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open navigation menu" />}>
                <Menu />
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader><SheetTitle>{user.fullName || user.name || "Your account"}</SheetTitle></SheetHeader>
                <nav className="drawer-nav" aria-label="Account navigation">
                  {items.map(({ name, href, icon: Icon }) => (
                    <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>
                      <Icon size={18} />{name}
                    </Link>
                  ))}
                  <Button variant="outline" onClick={() => { setOpen(false); void logout(); }}>Sign out</Button>
                </nav>
              </SheetContent>
            </Sheet>
          </> : !isLoading && <>
            {pathname !== "/login" && <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Sign in</Link>}
            {pathname !== "/register" && <Link href="/register" className={buttonVariants({ size: "sm" })}>Get started</Link>}
          </>}
        </div>
      </div>
    </header>
  );
}
