import type { NextRequest } from "next/server";
import { storeCartRequest } from "@/lib/woo";

// Acciones del carrito de la Store API que el navegador puede usar.
const ACTIONS = new Set([
  "add-item",
  "update-item",
  "remove-item",
  "apply-coupon",
  "remove-coupon",
  "update-customer",
  "select-shipping-rate",
]);

export async function POST(req: NextRequest, ctx: RouteContext<"/api/cart/[action]">) {
  const { action } = await ctx.params;
  if (!ACTIONS.has(action)) {
    return Response.json({ code: "not_found", message: "Acción no válida" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, data } = await storeCartRequest(`/cart/${action}`, {
    method: "POST",
    body,
  });
  return Response.json(data, { status });
}
