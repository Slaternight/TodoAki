"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { filtersToParams, type FilterValues } from "@/lib/productFilters";

const ORDEN_OPTIONS = [
  { value: "reciente", label: "Más recientes" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre: A–Z" },
];

export function ProductFilters({ values }: { values: FilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [min, setMin] = useState(values.min);
  const [max, setMax] = useState(values.max);

  function push(next: FilterValues) {
    const qs = filtersToParams(next);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  // Mezcla los precios escritos (estado local) con el resto de filtros.
  const withPrice = (extra: Partial<FilterValues>): FilterValues => ({ ...values, min, max, ...extra });

  const hasFilters =
    values.orden !== "reciente" || !!values.min || !!values.max || values.oferta || values.stock;

  const toggle = (active: boolean, on: string) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
      active ? on : "border-zinc-300 text-zinc-700 hover:border-zinc-400"
    }`;

  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">Ordenar</span>
        <select
          value={values.orden}
          onChange={(e) => push(withPrice({ orden: e.target.value }))}
          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        >
          {ORDEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          push(withPrice({}));
        }}
        className="flex items-center gap-2 text-sm"
      >
        <span className="text-zinc-500">Precio</span>
        <input
          inputMode="numeric"
          placeholder="Min"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          aria-label="Precio mínimo"
          className="w-24 rounded-lg border border-zinc-300 px-2.5 py-1.5 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        />
        <span className="text-zinc-400">–</span>
        <input
          inputMode="numeric"
          placeholder="Max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          aria-label="Precio máximo"
          className="w-24 rounded-lg border border-zinc-300 px-2.5 py-1.5 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
        />
        <button type="submit" className="btn btn-outline btn-sm">
          Aplicar
        </button>
      </form>

      <button
        type="button"
        onClick={() => push(withPrice({ oferta: !values.oferta }))}
        aria-pressed={values.oferta}
        className={toggle(values.oferta, "border-accent-500 bg-accent-50 text-accent-700")}
      >
        En oferta
      </button>
      <button
        type="button"
        onClick={() => push(withPrice({ stock: !values.stock }))}
        aria-pressed={values.stock}
        className={toggle(values.stock, "border-brand-600 bg-brand-50 text-brand-700")}
      >
        Solo disponibles
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            router.push(pathname, { scroll: false });
          }}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
