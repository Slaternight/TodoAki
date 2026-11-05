import { logoutCustomer } from "@/lib/auth";

export async function POST() {
  await logoutCustomer();
  return Response.json({ ok: true });
}
