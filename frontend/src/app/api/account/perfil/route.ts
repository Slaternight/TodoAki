import type { NextRequest } from "next/server";
import { updateProfile } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await updateProfile({
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    billing: (body.billing ?? {}) as Record<string, string>,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ user: result.user });
}
