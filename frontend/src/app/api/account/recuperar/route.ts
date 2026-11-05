import type { NextRequest } from "next/server";
import { requestPasswordReset } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  await requestPasswordReset(String(body.email ?? "").trim());
  // Siempre ok: no revelamos si el correo existe.
  return Response.json({ ok: true });
}
