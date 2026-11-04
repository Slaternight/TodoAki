"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { cart } = useCart();
  const count = cart?.items_count ?? 0;

  return (
    <Link
      href="/carrito"
      aria-label={count > 0 ? `Carrito, ${count} artículos` : "Carrito"}
      className="relative inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-800 transition hover:border-brand-500 hover:text-brand-700"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h12l-1 10.5a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 7 18.5L6 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9.2 8a2.8 2.8 0 0 1 5.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
