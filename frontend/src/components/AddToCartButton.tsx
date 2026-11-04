"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { useProductPurchase } from "./ProductPurchase";

export function AddToCartButton() {
  const { mutate, pending, error } = useCart();
  const { product, selection, missing, variation } = useProductPurchase();
  const isVariable = product.type === "variable";
  // Lo que realmente se agrega: el producto simple o la variación elegida.
  const item = isVariable ? variation : product;
  const { minimum, maximum, multiple_of } = (item ?? product).add_to_cart;
  const [quantity, setQuantity] = useState(product.add_to_cart.minimum || 1);
  // Id de lo último que se agregó, para no mostrar "Agregado" si el cliente cambia de talla.
  const [addedId, setAddedId] = useState<number | null>(null);

  if (product.type !== "simple" && !isVariable) {
    // Productos agrupados o externos: no se venden desde este front.
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Este producto no se puede comprar en línea.
      </p>
    );
  }

  let unavailable: string | null = null;
  if (isVariable && missing.length > 0) unavailable = `Elige ${missing.join(" y ").toLowerCase()}`;
  else if (!item) unavailable = "Combinación no disponible";
  else if (!item.is_purchasable || !item.is_in_stock) unavailable = "Agotado";

  async function handleAdd() {
    if (!item) return;
    setAddedId(null);
    const body = isVariable
      ? {
          id: item.id,
          quantity,
          variation: Object.entries(selection).map(([attribute, value]) => ({ attribute, value })),
        }
      : { id: item.id, quantity };
    if (await mutate("add-item", body)) setAddedId(item.id);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="number"
          aria-label="Cantidad"
          min={minimum}
          max={maximum}
          step={multiple_of}
          value={quantity}
          disabled={unavailable !== null}
          onChange={(e) => setQuantity(Math.max(minimum, Number(e.target.value) || minimum))}
          className="w-20 rounded-full border border-zinc-300 px-4 py-3 text-center outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={pending || unavailable !== null}
          className={`flex-1 rounded-full px-6 py-3 font-semibold transition-colors ${
            unavailable
              ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
              : "bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-60"
          }`}
        >
          {unavailable ?? (pending ? "Agregando…" : "Agregar al carrito")}
        </button>
      </div>
      {item && addedId === item.id && (
        <p className="text-sm text-green-700">
          Agregado.{" "}
          <Link href="/carrito" className="underline">
            Ver carrito
          </Link>
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
