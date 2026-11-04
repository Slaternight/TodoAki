import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/SiteHeader";
import { getCategories } from "@/lib/woo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            Lo que buscas, de China a Colombia. Miles de productos a buen precio, con pago seguro y
            envíos a todo el país.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold text-zinc-900">Categorías</h3>
          <Suspense fallback={null}>
            <FooterCategories />
          </Suspense>
        </div>

        <div>
          <h3 className="font-display text-sm font-bold text-zinc-900">Pago y envío</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>Pago seguro con Wompi</li>
            <li>Tarjetas, PSE, Nequi y Bancolombia</li>
            <li>Envíos a toda Colombia</li>
            <li>Confirmación por correo</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-zinc-400 sm:flex-row">
          <p>© Todazo · De China a Colombia</p>
          <p>Pagos procesados de forma segura por Wompi</p>
        </div>
      </div>
    </footer>
  );
}

async function FooterCategories() {
  const categories = await getCategories();
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {categories.slice(0, 8).map((category) => (
        <li key={category.id}>
          <Link
            href={`/categoria/${category.slug}`}
            className="text-zinc-500 transition hover:text-brand-700"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
