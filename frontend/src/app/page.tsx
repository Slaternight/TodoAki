import Link from "next/link";
import { ProductBrowser } from "@/components/ProductBrowser";
import { categoryMeta } from "@/lib/categoryMeta";
import { getCategories, getProductsPage } from "@/lib/woo";

const BENEFITS = [
  { icon: "🔒", title: "Pago seguro", sub: "con Wompi" },
  { icon: "🚚", title: "Envíos", sub: "a toda Colombia" },
  { icon: "🏷️", title: "Buenos precios", sub: "directo de origen" },
  { icon: "🛍️", title: "Miles", sub: "de productos" },
];

export default async function Home() {
  const [{ products, total }, categories] = await Promise.all([
    getProductsPage(),
    getCategories(),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-6 py-14 text-white sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-accent-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-52 w-52 rounded-full bg-brand-400/40 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            ✨ Nuevos productos cada semana
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Todo lo que buscas, en un solo lugar
          </h1>
          <p className="mt-4 max-w-md text-base text-white/85">
            De China a Colombia: tecnología, hogar, cocina, juguetes y mucho más, a precio de verdad.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#productos" className="btn btn-accent btn-lg">
              Ver productos
            </a>
            <a href="#categorias" className="btn btn-lg bg-white/15 text-white hover:bg-white/25">
              Explorar categorías
            </a>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="card flex items-center gap-3 p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl">
              {b.icon}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-zinc-800">{b.title}</p>
              <p className="text-xs text-zinc-500">{b.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categorías */}
      {categories.length > 0 && (
        <section id="categorias" className="scroll-mt-28">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Explora por categoría
          </h2>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((category) => {
              const meta = categoryMeta(category.name);
              return (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="card flex flex-col items-center gap-2 p-4 text-center transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${meta.tint}`}>
                    {meta.icon}
                  </span>
                  <span className="text-xs font-medium text-zinc-700">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Productos */}
      <section id="productos" className="scroll-mt-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Todos los productos
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Explora todo nuestro catálogo.</p>
          </div>
        </div>
        <div className="mt-5">
          <ProductBrowser initialProducts={products} total={total} />
        </div>
      </section>
    </div>
  );
}
