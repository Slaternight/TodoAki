import type { NextRequest } from "next/server";
import { resetPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await resetPassword({
    login: String(body.login ?? ""),
    key: String(body.key ?? ""),
    password: String(body.password ?? ""),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true });
}
