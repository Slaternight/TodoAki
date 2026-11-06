import type { NextRequest } from "next/server";
import { isRadarUnlocked, writeDecision, type RadarStatus } from "@/lib/radar";

const VALID: RadarStatus[] = ["approved", "dismissed", "pending"];

export async function POST(req: NextRequest) {
  // Re-verificamos la sesión aquí: la UI oculta botones, pero la autorización
  // real va en cada route handler, cerca de los datos.
  if (!(await isRadarUnlocked())) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const term = String(body.term ?? "");
  const decision = body.decision as RadarStatus;
  if (!VALID.includes(decision)) {
    return Response.json({ error: "Decisión inválida." }, { status: 400 });
  }

  const res = await writeDecision(term, decision);
  if (!res.ok) return Response.json({ error: res.error }, { status: 500 });
  return Response.json({ ok: true });
}
