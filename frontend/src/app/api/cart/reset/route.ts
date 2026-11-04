import { resetCart } from "@/lib/woo";

// Se llama desde la página de resultado cuando Wompi aprueba el pago.
export async function POST() {
  await resetCart();
  return new Response(null, { status: 204 });
}
