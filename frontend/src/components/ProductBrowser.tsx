"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

// Grilla de productos con botón "Cargar más" que va trayendo más páginas
// desde /api/products (sirve para categorías y para la home).
export function ProductBrowser({
  initialProducts,
  total,
  categoryId,
  search,
  params,
  perPage = 24,
}: {
  initialProducts: Product[];
  total: number;
  categoryId?: number;
  search?: string;
  params?: string;
  perPage?: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <div className="card p-10 text-center text-zinc-500">No hay productos para mostrar.</div>
    );
  }

  const hasMore = products.length < total;

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const next = page + 1;
      let url: string;
      if (search) {
        url = `/api/search?q=${encodeURIComponent(search)}&page=${next}&per_page=${perPage}`;
      } else {
        const qs = new URLSearchParams({ page: String(next), per_page: String(perPage) });
        if (categoryId) qs.set("category", String(categoryId));
        url = `/api/products?${qs}${params ? `&${params}` : ""}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { products: Product[] };
      setProducts((prev) => {
        // Evita duplicados si el catálogo cambió entre páginas.
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
    } catch {
      setError("No se pudieron cargar más productos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button onClick={loadMore} disabled={loading} className="btn btn-outline btn-lg">
            {loading ? "Cargando…" : "Cargar más productos"}
          </button>
          <p className="text-xs text-zinc-500">
            Mostrando {products.length} de {total}
          </p>
        </div>
      )}
    </div>
  );
}
