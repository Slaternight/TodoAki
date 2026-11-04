"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CartSummary } from "@/components/CartSummary";
import { formatPrice, variationLabel } from "@/lib/format";

export default function CartPage() {
  const { cart, loading, pending, error, mutate } = useCart();
  const [coupon, setCoupon] = useState("");

  if (loading) return <p className="py-20 text-center text-zinc-500">Cargando carrito…</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl">
          🛒
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Explora el catálogo y encuentra algo que te guste.
        </p>
        <Link href="/" className="btn btn-primary btn-md mt-6">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Carrito
        </h1>
        <ul className="space-y-3">
          {cart.items.map((item) => (
            <li key={item.key} className="card flex gap-4 p-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {item.images[0] && (
                  <Image
                    src={item.images[0].thumbnail}
                    alt={item.images[0].alt || item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800">{item.name}</p>
                    {item.variation.length > 0 && (
                      <p className="text-sm text-zinc-500">{variationLabel(item.variation)}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-zinc-900">
                    {formatPrice(item.totals.line_subtotal, item.totals)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {item.quantity_limits.editable ? (
                    <input
                      // La key fuerza a reiniciar el campo si WooCommerce ajusta la cantidad.
                      key={`${item.key}-${item.quantity}`}
                      type="number"
                      aria-label={`Cantidad de ${item.name}`}
                      min={item.quantity_limits.minimum}
                      max={item.quantity_limits.maximum}
                      step={item.quantity_limits.multiple_of}
                      defaultValue={item.quantity}
                      disabled={pending}
                      onBlur={(e) => {
                        const quantity = Number(e.target.value);
                        if (quantity > 0 && quantity !== item.quantity) {
                          mutate("update-item", { key: item.key, quantity });
                        }
                      }}
                      className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-center outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    />
                  ) : (
                    <span className="text-zinc-600">Cantidad: {item.quantity}</span>
                  )}
                  <button
                    onClick={() => mutate("remove-item", { key: item.key })}
                    disabled={pending}
                    className="font-medium text-zinc-500 transition hover:text-accent-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </section>

      <aside className="card h-fit space-y-5 p-6">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (coupon && (await mutate("apply-coupon", { code: coupon }))) setCoupon("");
          }}
        >
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Cupón de descuento"
            className="input min-w-0 flex-1 rounded-full"
          />
          <button disabled={pending} className="btn btn-outline btn-sm shrink-0">
            Aplicar
          </button>
        </form>
        {cart.coupons.map((c) => (
          <p key={c.code} className="flex justify-between text-sm">
            <span className="text-zinc-600">
              Cupón: <span className="font-medium">{c.code}</span>
            </span>
            <button
              onClick={() => mutate("remove-coupon", { code: c.code })}
              className="text-zinc-500 underline transition hover:text-accent-600"
            >
              Quitar
            </button>
          </p>
        ))}
        <CartSummary cart={cart} />
        <Link href="/checkout" className="btn btn-accent btn-lg w-full">
          Ir a pagar
        </Link>
      </aside>
    </div>
  );
}
