import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

// Panel del "Radar de tendencias" (Fase 1 del agente de sourcing).
//
// Lee la shortlist que genera agent/trends.py (frontend/data/radar.json) y
// guarda las decisiones del dueño (aprobar / descartar) en un archivo aparte
// (frontend/data/radar-decisions.json, ignorado por git).
//
// Es un panel SOLO para el dueño: se protege con la contraseña RADAR_PASSWORD.
// Si esa variable no está definida, el panel queda abierto (cómodo en local,
// pero hay que definirla antes de publicar). La sesión vive en una cookie
// httpOnly firmada; el navegador nunca ve la contraseña.

const DATA_DIR = path.join(process.cwd(), "data");
const RADAR_FILE = path.join(DATA_DIR, "radar.json");
const DECISIONS_FILE = path.join(DATA_DIR, "radar-decisions.json");

const SESSION_COOKIE = "radar_session";
const TOKEN_MESSAGE = "radar-owner-v1";

export type RadarItem = {
  term: string;
  niche: string;
  score: number; // % de crecimiento; 10000 = "Breakout"
  aliexpress: string;
};

export type RadarData = {
  generatedAt: string | null;
  geo: string;
  items: RadarItem[];
};

export type DecisionValue = "approved" | "dismissed";
export type Decision = { decision: DecisionValue; at: string };
export type Decisions = Record<string, Decision>;

export type RadarStatus = "pending" | DecisionValue;
export type RadarEntry = RadarItem & { status: RadarStatus; decidedAt: string | null };

function keyFor(term: string) {
  return term.trim().toLowerCase();
}

// ---- Lectura de datos ----

export async function readRadar(): Promise<RadarData> {
  try {
    const raw = await readFile(RADAR_FILE, "utf8");
    const data = JSON.parse(raw) as Partial<RadarData>;
    return {
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : null,
      geo: typeof data.geo === "string" ? data.geo : "CO",
      items: Array.isArray(data.items) ? (data.items as RadarItem[]) : [],
    };
  } catch {
    // Sin archivo todavía: el agente aún no ha corrido.
    return { generatedAt: null, geo: "CO", items: [] };
  }
}

export async function readDecisions(): Promise<Decisions> {
  try {
    const raw = await readFile(DECISIONS_FILE, "utf8");
    const data = JSON.parse(raw) as Decisions;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function mergeEntries(radar: RadarData, decisions: Decisions): RadarEntry[] {
  return radar.items.map((item) => {
    const d = decisions[keyFor(item.term)];
    return {
      ...item,
      status: d?.decision ?? "pending",
      decidedAt: d?.at ?? null,
    };
  });
}

// ---- Escritura de decisiones ----

export async function writeDecision(
  term: string,
  decision: RadarStatus,
): Promise<{ ok: boolean; error?: string }> {
  const key = keyFor(term);
  if (!key) return { ok: false, error: "Falta el término." };
  try {
    const current = await readDecisions();
    if (decision === "pending") {
      delete current[key];
    } else {
      current[key] = { decision, at: new Date().toISOString() };
    }
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DECISIONS_FILE, JSON.stringify(current, null, 2), "utf8");
    return { ok: true };
  } catch {
    // En Vercel y hosts serverless el disco es de solo lectura: las decisiones
    // no se pueden guardar en archivo (ver docs/despliegue-hostinger.md).
    return {
      ok: false,
      error: "No se pudo guardar la decisión (el disco es de solo lectura en este entorno).",
    };
  }
}

// ---- Protección (solo dueño) ----

export function radarConfigured(): boolean {
  return Boolean(process.env.RADAR_PASSWORD);
}

function expectedToken(): string | null {
  const pwd = process.env.RADAR_PASSWORD;
  if (!pwd) return null;
  return createHmac("sha256", pwd).update(TOKEN_MESSAGE).digest("hex");
}

function sameToken(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isRadarUnlocked(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return true; // Sin contraseña configurada => abierto (solo dev).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(token && sameToken(token, expected));
}

export async function unlockRadar(password: string): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return true; // No hay contraseña que validar.
  const given = createHmac("sha256", password).update(TOKEN_MESSAGE).digest("hex");
  if (!sameToken(given, expected)) return false;
  (await cookies()).set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return true;
}

export async function lockRadar(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
