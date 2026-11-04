import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import {
  ProductGallery,
  ProductPrice,
  ProductPurchaseProvider,
  VariationPicker,
} from "@/components/ProductPurchase";
import { ProductSpecs } from "@/components/ProductSpecs";
import { stripHtml } from "@/lib/format";
import { getProduct, getProducts, getProductVariations } from "@/lib/woo";

// Prerenderiza los productos más recientes en el build; el resto se genera en
// la primera visita y queda en caché. Cache Components exige al menos un valor.
export async function generateStaticParams() {
  const products = await getProducts();
  return products.length > 0
    ? products.map((p) => ({ slug: p.slug }))
    : [{ slug: "__placeholder__" }];
}

export async function generateMetadata(props: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: stripHtml(product.short_description).slice(0, 160),
    openGraph: { images: product.images[0]?.src },
  };
}

async function ProductDetails({ params }: Pick<PageProps<"/producto/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const variations = product.type === "variable" ? await getProductVariations(product.id) : [];
  const category = product.categories[0];

  return (
    <>
      <ProductPurchaseProvider product={product} variations={variations}>
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
          <Link href="/" className="transition hover:text-brand-700">
            Inicio
          </Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/categoria/${category.slug}`} className="transition hover:text-brand-700">
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <ProductGallery />

          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
                {product.name}
              </h1>
              <ProductPrice className="mt-3 text-2xl" />
            </div>

            {product.short_description && (
              <div
                className="wc-content text-zinc-600"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}

            <VariationPicker />
            <AddToCartButton />

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-100 pt-5 text-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">🔒 Pago seguro con Wompi</span>
              <span className="inline-flex items-center gap-2">🚚 Envíos a toda Colombia</span>
            </div>

            <ProductSpecs product={product} />

            {product.description && (
              <div className="border-t border-zinc-200 pt-6">
                <h2 className="mb-3 font-display text-lg font-bold">Descripción</h2>
                <div
                  className="wc-content text-sm text-zinc-700"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>
      </ProductPurchaseProvider>

      {category && (
        <Suspense fallback={<RelatedSkeleton />}>
          <RelatedProducts
            categoryId={category.id}
            excludeId={product.id}
            categoryName={category.name}
            categorySlug={category.slug}
          />
        </Suspense>
      )}
    </>
  );
}

async function RelatedProducts({
  categoryId,
  excludeId,
  categoryName,
  categorySlug,
}: {
  categoryId: number;
  excludeId: number;
  categoryName: string;
  categorySlug: string;
}) {
  const products = await getProducts({ categoryId, perPage: 12 });
  const related = products.filter((p) => p.id !== excludeId).slice(0, 4);
  if (related.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-200 pt-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          También te podría interesar
        </h2>
        <Link
          href={`/categoria/${categorySlug}`}
          className="hidden shrink-0 text-sm font-medium text-brand-700 hover:underline sm:block"
        >
          Ver más de {categoryName} →
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <section className="mt-16 border-t border-zinc-200 pt-10">
      <div className="h-7 w-64 animate-pulse rounded bg-zinc-100" />
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    </section>
  );
}

export default function ProductPage(props: PageProps<"/producto/[slug]">) {
  return (
    <Suspense
      fallback={<div className="aspect-square w-full animate-pulse rounded-3xl bg-zinc-100 md:w-1/2" />}
    >
      <ProductDetails params={props.params} />
    </Suspense>
  );
}
