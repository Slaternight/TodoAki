import type { NextRequest } from "next/server";
import { filtersToQuery, readFilters } from "@/lib/productFilters";
import { getProductsPage } from "@/lib/woo";

// Páginas del catálogo para el botón "Cargar más" del navegador.
// El navegador nunca llama a WordPress directo: pasa por aquí.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const categoryRaw = sp.get("category");
  const categoryId = categoryRaw ? Number(categoryRaw) : undefined;
  if (categoryRaw && !Number.isFinite(categoryId)) {
    return Response.json({ message: "Categoría no válida" }, { status: 400 });
  }

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(48, Math.max(1, Number(sp.get("per_page")) || 24));
  const search = sp.get("search")?.trim() || undefined;
  const query = filtersToQuery(readFilters((k) => sp.get(k)));

  try {
    const data = await getProductsPage({ categoryId, page, perPage, search, ...query });
    return Response.json(data);
  } catch {
    return Response.json({ message: "No se pudieron cargar los productos." }, { status: 502 });
  }
}
