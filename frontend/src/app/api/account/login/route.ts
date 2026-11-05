import type { NextRequest } from "next/server";
import { loginCustomer } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await loginCustomer({
    email: String(body.email ?? "").trim(),
    password: String(body.password ?? ""),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
  return Response.json({ user: result.user });
}
