import "server-only";
import { cookies } from "next/headers";
import type { AccountOrder, AuthUser } from "./types";
import { wpUrl } from "./woo";

// Cuentas de cliente. Igual que el carrito: el navegador nunca habla con
// WordPress ni ve el token; pasa por /api/account/* y la sesión vive en una
// cookie httpOnly con el token firmado que emite el plugin.

const AUTH_COOKIE = "wc_auth_token";

function authUrl(path: string) {
  return wpUrl(`/tienda-headless/v1/auth${path}`);
}

async function setAuthCookie(token: string) {
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

// Registro y login comparten forma: devuelven { token, user } y guardan la cookie.
async function authPost(path: string, body: unknown): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(authUrl(path), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "No hay conexión con la tienda. Intenta de nuevo." };
  }

  const data = (await res.json().catch(() => null)) as
    | { token?: string; user?: AuthUser; message?: string }
    | null;

  if (!res.ok || !data?.token || !data.user) {
    return { ok: false, error: data?.message ?? "No se pudo completar la solicitud." };
  }

  await setAuthCookie(data.token);
  return { ok: true, user: data.user };
}

export function registerCustomer(input: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}) {
  return authPost("/registro", input);
}

export function loginCustomer(input: { email: string; password: string }) {
  return authPost("/login", input);
}

export async function logoutCustomer() {
  (await cookies()).delete(AUTH_COOKIE);
}

// Lee la sesión actual (o null). Solo lee la cookie, así que puede usarse en
// Server Components.
export async function getSessionUser(): Promise<AuthUser | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(authUrl("/yo"), {
      cache: "no-store",
      headers: { Accept: "application/json", "X-TH-Auth": token },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AuthUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function getCustomerOrders(): Promise<AccountOrder[]> {
  const token = await getAuthToken();
  if (!token) return [];
  try {
    const res = await fetch(authUrl("/pedidos"), {
      cache: "no-store",
      headers: { Accept: "application/json", "X-TH-Auth": token },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { orders?: AccountOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}
