import type { NextRequest } from "next/server";
import { storeCartRequest } from "@/lib/woo";

// ID de la pasarela que registra el plugin tienda-headless en WordPress.
const PAYMENT_METHOD = "wompi_headless";
const WOMPI_CHECKOUT = "https://checkout.wompi.co/p/";

type CheckoutResponse = {
  order_id: number;
  payment_result?: { payment_status: string; redirect_url: string };
};

export async function POST(req: NextRequest) {
  const { billing_address, shipping_address, customer_note } = await req.json();

  // Crea el pedido en WooCommerce con el carrito actual. El plugin calcula el
  // total, firma la transacción y devuelve la URL del Web Checkout de Wompi.
  const { ok, status, data } = await storeCartRequest("/checkout", {
    method: "POST",
    body: {
      billing_address,
      shipping_address,
      customer_note: customer_note ?? "",
      payment_method: PAYMENT_METHOD,
    },
  });

  if (!ok) {
    return Response.json(data, { status });
  }

  const order = data as CheckoutResponse;
  const redirectUrl = order.payment_result?.redirect_url ?? "";
  if (!redirectUrl.startsWith(WOMPI_CHECKOUT)) {
    return Response.json(
      {
        code: "invalid_payment_redirect",
        message: "No se pudo iniciar el pago con Wompi. Revisa la configuración de la pasarela.",
      },
      { status: 502 },
    );
  }

  return Response.json({ order_id: order.order_id, redirect_url: redirectUrl });
}
