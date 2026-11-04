import { storeCartRequest } from "@/lib/woo";

export async function GET() {
  const { status, data } = await storeCartRequest("/cart");
  return Response.json(data, { status });
}
