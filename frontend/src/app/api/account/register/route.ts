import type { NextRequest } from "next/server";
import { registerCustomer } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await registerCustomer({
    email: String(body.email ?? "").trim(),
    password: String(body.password ?? ""),
    first_name: body.first_name ? String(body.first_name).trim() : undefined,
    last_name: body.last_name ? String(body.last_name).trim() : undefined,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ user: result.user });
}
