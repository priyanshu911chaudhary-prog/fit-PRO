"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface AuthUser {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  isEmailVerified: boolean;
  role: string;
  hasProfile?: boolean;
  authProvider?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }, redirectUrl?: string) => Promise<void>;
  register: (data: { name?: string; fullName?: string; email: string; password: string }) => Promise<{ success: boolean; emailSent?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient<{ user: AuthUser; hasProfile?: boolean; isProfileComplete?: boolean }>("/api/auth/me");
      if (res.success && res.data?.user) {
        const hasProfile = Boolean(res.data.hasProfile ?? res.data.isProfileComplete ?? res.data.user.hasProfile);
        setUser({
          ...res.data.user,
          hasProfile,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient<{ user: AuthUser; hasProfile?: boolean; isProfileComplete?: boolean }>("/api/auth/me")
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data?.user) {
            const hasProfile = Boolean(res.data.hasProfile ?? res.data.isProfileComplete ?? res.data.user.hasProfile);
            setUser({
              ...res.data.user,
              hasProfile,
            });
          } else {
            setUser(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (data: { email: string; password: string }, redirectUrl?: string) => {
    const res = await apiClient<{ user: AuthUser; hasProfile?: boolean; isProfileComplete?: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.success && res.data?.user) {
      const displayName = res.data.user.fullName || res.data.user.name || "User";
      const hasProfile = Boolean(res.data.hasProfile ?? res.data.isProfileComplete ?? res.data.user.hasProfile);
      setUser({
        ...res.data.user,
        name: displayName,
        hasProfile,
      });
      toast.success(res.message || "Logged in successfully");
      const dest =
        !hasProfile
          ? "/onboarding"
          : redirectUrl && !redirectUrl.startsWith("/login")
          ? (redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`)
          : "/dashboard";
      window.location.href = dest;
    }
  };

  const register = async (data: { name?: string; fullName?: string; email: string; password: string }): Promise<{ success: boolean; emailSent?: boolean }> => {
    const res = await apiClient<{ user: AuthUser; emailSent?: boolean }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: data.fullName || data.name,
        email: data.email,
        password: data.password,
      }),
    });

    if (res.success) {
      if (res.data?.emailSent === false) {
        toast.warning("Account created, but verification email could not be sent.");
        return { success: true, emailSent: false };
      }
      toast.success(res.message || "Registration successful! Please check your email to verify your account.");
      router.push("/login?registered=1");
      return { success: true, emailSent: true };
    }
    return { success: false, emailSent: false };
  };

  const logout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    } finally {
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
