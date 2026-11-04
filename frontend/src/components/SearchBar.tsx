"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Sugerencias en vivo (con retraso y cancelando la petición anterior).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&per_page=6`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.products ?? []);
        setTotal(data.total ?? 0);
        setActive(-1);
      } catch {
        if (!ctrl.signal.aborted) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Cerrar el desplegable al hacer clic fuera.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function goToSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    setOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(t)}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && results[active]) {
      setOpen(false);
      router.push(`/producto/${results[active].slug}`);
    } else {
      goToSearch(q);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={onSubmit} role="search">
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Buscar productos…"
            aria-label="Buscar productos"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            autoComplete="off"
            className="w-full rounded-full border border-zinc-300 bg-white py-2 pl-4 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:text-brand-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </form>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
        >
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">Sin resultados para «{q.trim()}».</p>
          ) : (
            <>
              <ul className="max-h-[60vh] overflow-auto py-1">
                {results.map((p, i) => {
                  const price = p.prices.price_range
                    ? `Desde ${formatPrice(p.prices.price_range.min_amount, p.prices)}`
                    : formatPrice(p.prices.price, p.prices);
                  return (
                    <li key={p.id} role="option" aria-selected={i === active}>
                      <Link
                        href={`/producto/${p.slug}`}
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-center gap-3 px-3 py-2 ${
                          i === active ? "bg-brand-50" : "hover:bg-zinc-50"
                        }`}
                      >
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-white">
                          {p.images[0] && (
                            <Image
                              src={p.images[0].thumbnail || p.images[0].src}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-contain"
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-800">{p.name}</span>
                          <span className="block text-xs font-semibold text-zinc-600">{price}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => goToSearch(q)}
                className="block w-full border-t border-zinc-100 px-4 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Ver todos los resultados{total > 0 ? ` (${total})` : ""}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
