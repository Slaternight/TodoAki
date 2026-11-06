import type { NextRequest } from "next/server";
import { unlockRadar } from "@/lib/radar";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ok = await unlockRadar(String(body.password ?? ""));
  if (!ok) return Response.json({ error: "Contraseña incorrecta." }, { status: 401 });
  return Response.json({ ok: true });
}
