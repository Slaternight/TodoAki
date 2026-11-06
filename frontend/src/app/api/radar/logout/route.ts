import { lockRadar } from "@/lib/radar";

export async function POST() {
  await lockRadar();
  return Response.json({ ok: true });
}
