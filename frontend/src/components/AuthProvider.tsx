"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/types";

type Credentials = { email: string; password: string };
type RegisterInput = Credentials & { first_name?: string; last_name?: string };
type Outcome = { ok: boolean; error?: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (input: Credentials) => Promise<Outcome>;
  register: (input: RegisterInput) => Promise<Outcome>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setUser((data?.user as AuthUser) ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(async (path: string, body: object): Promise<Outcome> => {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, error: (data as { error?: string } | null)?.error ?? "Algo salió mal. Intenta de nuevo." };
      }
      setUser((data?.user as AuthUser) ?? null);
      return { ok: true };
    } catch {
      return { ok: false, error: "No hay conexión con la tienda. Intenta de nuevo." };
    }
  }, []);

  const login = useCallback((input: Credentials) => submit("/api/account/login", input), [submit]);
  const register = useCallback(
    (input: RegisterInput) => submit("/api/account/register", input),
    [submit],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
