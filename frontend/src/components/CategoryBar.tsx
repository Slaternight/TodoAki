"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { categoryIcon } from "@/lib/categoryMeta";
import type { Category } from "@/lib/types";

// Barra de categorías en una sola fila, con flechas ‹ › que aparecen solo
// cuando hay desbordamiento y se ocultan al llegar a cada extremo.
// En celular/trackpad se desliza con el dedo; con mouse, con las flechas.
export function CategoryBar({ categories }: { categories: Category[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function scrollStep(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <nav className="border-t border-zinc-100 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative">
          {!atStart && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent" />
              <button
                type="button"
                aria-label="Ver categorías anteriores"
                onClick={() => scrollStep(-1)}
                className="absolute left-0 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white text-lg leading-none text-zinc-600 shadow-sm transition hover:border-brand-500 hover:text-brand-700"
              >
                ‹
              </button>
            </>
          )}

          <div
            ref={scroller}
            className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <Link href="/" className="chip shrink-0">
              <span aria-hidden="true">🛍️</span>Todo
            </Link>
            {categories.map((category) => (
              <Link key={category.id} href={`/categoria/${category.slug}`} className="chip shrink-0">
                <span aria-hidden="true">{categoryIcon(category.name)}</span>
                {category.name}
              </Link>
            ))}
          </div>

          {!atEnd && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
              <button
                type="button"
                aria-label="Ver más categorías"
                onClick={() => scrollStep(1)}
                className="absolute right-0 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white text-lg leading-none text-zinc-600 shadow-sm transition hover:border-brand-500 hover:text-brand-700"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
