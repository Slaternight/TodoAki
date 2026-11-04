import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

// WordPress llama aquí al crear/editar un producto o cambiar su stock.
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET ?? "";
  const received = req.headers.get("x-revalidate-secret") ?? "";

  const valid =
    expected.length > 0 &&
    expected.length === received.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  if (!valid) {
    return Response.json({ message: "No autorizado" }, { status: 401 });
  }

  // expire: 0 -> la siguiente visita espera los datos nuevos en lugar de ver
  // el precio o el stock anterior una vez más.
  revalidateTag("products", { expire: 0 });
  return Response.json({ revalidated: true });
}
