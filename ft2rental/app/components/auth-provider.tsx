"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBackendApiBaseUrl, type SessionUser } from "@/lib/rental-locations";

type AuthState = "loading" | "signed-out" | "signed-in";

type AuthContextValue = {
  state: AuthState;
  token: string | null;
  user: SessionUser | null;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "t2rental.session_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = useMemo(() => getBackendApiBaseUrl(), []);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [state, setState] = useState<AuthState>(() => (token ? "loading" : "signed-out"));
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function hydrateSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/session`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Session expired.");
        }

        const payload = (await response.json()) as { data?: { user?: SessionUser } };
        if (!active || !payload.data?.user) {
          return;
        }

        setUser(payload.data.user);
        setState("signed-in");
      } catch {
        if (!active) {
          return;
        }

        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        setState("signed-out");
      }
    }

    hydrateSession();

    return () => {
      active = false;
    };
  }, [apiBaseUrl, token]);

  const signInWithGoogleToken = useCallback(async (idToken: string) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const payload = (await response.json()) as {
      data?: { token?: string; user?: SessionUser };
      error?: string;
    };

    if (!response.ok || !payload.data?.token || !payload.data?.user) {
      throw new Error(payload.error ?? "Google sign-in failed.");
    }

    window.localStorage.setItem(STORAGE_KEY, payload.data.token);
    setToken(payload.data.token);
    setUser(payload.data.user);
    setState("signed-in");
  }, [apiBaseUrl]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setState("signed-out");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, token, user, signInWithGoogleToken, signOut }),
    [state, token, user, signInWithGoogleToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
