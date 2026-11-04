import Link from "next/link";
import { Suspense } from "react";
import { CartLink } from "@/components/CartLink";
import { CategoryBar } from "@/components/CategoryBar";
import { SearchBar } from "@/components/SearchBar";
import { getCategories } from "@/lib/woo";

// Logo de Todazo (bolsa + wordmark). Reutilizado en header y footer.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 8h12l-1 10.5a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 7 18.5L6 8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9.2 8a2.8 2.8 0 0 1 5.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-zinc-900">
        Toda<span className="text-accent-500">zo</span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <>
      <div className="bg-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs font-medium">
          🇨🇴 Envíos a toda Colombia · Lo mejor, directo de China
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link href="/" aria-label="Todazo, ir al inicio" className="shrink-0">
            <Logo />
          </Link>
          <SearchBar className="hidden min-w-0 flex-1 sm:block" />
          <CartLink />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:hidden">
          <SearchBar />
        </div>
        <Suspense fallback={<div className="h-11" />}>
          <CategoryNav />
        </Suspense>
      </header>
    </>
  );
}

async function CategoryNav() {
  const categories = await getCategories();
  if (categories.length === 0) return null;
  return <CategoryBar categories={categories} />;
}
