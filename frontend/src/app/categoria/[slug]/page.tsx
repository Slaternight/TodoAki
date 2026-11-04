import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductBrowser } from "@/components/ProductBrowser";
import { ProductFilters } from "@/components/ProductFilters";
import { categoryMeta } from "@/lib/categoryMeta";
import { filtersToParams, filtersToQuery, readFilters } from "@/lib/productFilters";
import { getCategories, getProductsPage } from "@/lib/woo";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.length > 0
    ? categories.map((c) => ({ slug: c.slug }))
    : [{ slug: "__placeholder__" }];
}

async function findCategory(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata(props: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await findCategory(slug);
  return category ? { title: category.name } : {};
}

async function CategoryProducts({
  params,
  searchParams,
}: Pick<PageProps<"/categoria/[slug]">, "params" | "searchParams">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(slug);
  if (!category) notFound();

  const filters = readFilters((k) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  });
  const { products, total } = await getProductsPage({
    categoryId: category.id,
    ...filtersToQuery(filters),
  });
  const meta = categoryMeta(category.name);
  const filterParams = filtersToParams(filters);

  return (
    <>
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${meta.tint}`}>
          {meta.icon}
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {category.name}
          </h1>
          <p className="text-sm text-zinc-500">{total} productos</p>
        </div>
      </div>

      <div className="mt-6">
        <ProductFilters values={filters} />
      </div>

      <div className="mt-5">
        {total === 0 ? (
          <div className="card p-10 text-center text-zinc-500">
            No hay productos con estos filtros.
          </div>
        ) : (
          <ProductBrowser
            key={filterParams}
            initialProducts={products}
            total={total}
            categoryId={category.id}
            params={filterParams}
          />
        )}
      </div>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl bg-zinc-100" />
      ))}
    </div>
  );
}

export default function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="chip w-fit">
        ← Todos los productos
      </Link>
      <Suspense fallback={<GridSkeleton />}>
        <CategoryProducts params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
