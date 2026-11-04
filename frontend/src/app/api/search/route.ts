import type { NextRequest } from "next/server";
import { searchProductsPage } from "@/lib/woo";

// Búsqueda por nombre para el autocompletado y la página /buscar.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const query = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(48, Math.max(1, Number(sp.get("per_page")) || 24));

  if (query.length < 2) {
    return Response.json({ products: [], total: 0 });
  }

  try {
    const data = await searchProductsPage({ query, page, perPage });
    return Response.json(data);
  } catch {
    return Response.json({ message: "No se pudo buscar." }, { status: 502 });
  }
}
