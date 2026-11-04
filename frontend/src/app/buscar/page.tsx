import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductBrowser } from "@/components/ProductBrowser";
import { searchProductsPage } from "@/lib/woo";

export const metadata: Metadata = { title: "Buscar" };

async function SearchResults({ searchParams }: Pick<PageProps<"/buscar">, "searchParams">) {
  const params = await searchParams;
  const raw = params.q;
  const query = (typeof raw === "string" ? raw : "").trim();

  if (!query) {
    return (
      <div className="card p-10 text-center text-zinc-500">
        Escribe algo en el buscador para encontrar productos.
      </div>
    );
  }

  const { products, total } = await searchProductsPage({ query });

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        Resultados para «{query}»
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {total} {total === 1 ? "producto" : "productos"}
      </p>
      <div className="mt-6">
        {total === 0 ? (
          <div className="card p-10 text-center text-zinc-500">
            No encontramos productos para «{query}». Prueba con otra palabra.
          </div>
        ) : (
          <ProductBrowser key={query} initialProducts={products} total={total} search={query} />
        )}
      </div>
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-zinc-100" />
      ))}
    </div>
  );
}

export default function SearchPage(props: PageProps<"/buscar">) {
  return (
    <div className="space-y-2">
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
