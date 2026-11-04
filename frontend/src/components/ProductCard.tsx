import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Price } from "./Price";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group card overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/70"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {image && (
          <Image
            src={image.src}
            alt={image.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {!product.is_in_stock && (
          <span className="absolute inset-0 grid place-items-center bg-white/55">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
              Agotado
            </span>
          </span>
        )}
        {product.on_sale && product.is_in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Oferta
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-zinc-800 transition-colors group-hover:text-brand-700">
          {product.name}
        </h3>
        <Price prices={product.prices} className="mt-1.5 text-base" />
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="card p-10 text-center text-zinc-500">No hay productos para mostrar.</div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
