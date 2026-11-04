"use client";

import Link from "next/link";
import { useState } from "react";
import { decodeEntities, formatPrice, variationLabel } from "@/lib/format";
import type { Address, BillingAddress, Cart } from "@/lib/types";
import { useCart } from "./CartProvider";
import { CartSummary } from "./CartSummary";

// Wompi solo opera en Colombia.
const COUNTRY = "CO";

type FormState = Omit<BillingAddress, "country"> & { note: string };

function initialForm(cart: Cart): FormState {
  const b = cart.billing_address;
  return {
    email: b.email ?? "",
    first_name: b.first_name ?? "",
    last_name: b.last_name ?? "",
    phone: b.phone ?? "",
    address_1: b.address_1 ?? "",
    address_2: b.address_2 ?? "",
    city: b.city ?? "",
    state: b.state ?? "",
    postcode: b.postcode ?? "",
    note: "",
  };
}

export function CheckoutForm({ states }: { states: Record<string, string> }) {
  const { cart, loading } = useCart();

  if (loading) return <p className="py-20 text-center text-zinc-500">Cargando…</p>;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl">
          🛒
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Tu carrito está vacío</h1>
        <Link href="/" className="btn btn-primary btn-md mt-6">
          Ver productos
        </Link>
      </div>
    );
  }
  return <CheckoutSteps cart={cart} states={states} />;
}

function CheckoutSteps({ cart, states }: { cart: Cart; states: Record<string, string> }) {
  const { mutate, pending, error } = useCart();
  const [form, setForm] = useState(() => initialForm(cart));
  const [step, setStep] = useState<"address" | "review">("address");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const field = (name: keyof FormState) => ({
    name,
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  function addresses() {
    const shipping: Address = {
      first_name: form.first_name,
      last_name: form.last_name,
      address_1: form.address_1,
      address_2: form.address_2,
      city: form.city,
      state: form.state,
      postcode: form.postcode,
      country: COUNTRY,
      phone: form.phone,
    };
    const billing: BillingAddress = { ...shipping, email: form.email };
    return { billing_address: billing, shipping_address: shipping };
  }

  // Paso 1: guarda la dirección en el carrito para que WooCommerce calcule envío e impuestos.
  async function handleAddress(e: React.FormEvent) {
    e.preventDefault();
    if (await mutate("update-customer", addresses())) setStep("review");
  }

  // Paso 2: crea el pedido y redirige al Web Checkout de Wompi.
  async function handlePay() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addresses(), customer_note: form.note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(decodeEntities(data?.message ?? "No se pudo crear el pedido."));
        setPaying(false);
        return;
      }
      window.location.assign(data.redirect_url);
    } catch {
      setPayError("No hay conexión con la tienda. Intenta de nuevo.");
      setPaying(false);
    }
  }

  const stateOptions = Object.entries(states);

  // Pasos del checkout, para la cabecera.
  const steps = [
    { id: "address", label: "Datos de envío" },
    { id: "review", label: "Revisar y pagar" },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Finalizar compra
        </h1>

        <ol className="mb-8 mt-4 flex items-center gap-3 text-sm">
          {steps.map((s, i) => {
            const active = s.id === step;
            const done = step === "review" && s.id === "address";
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 font-medium ${
                    active ? "text-brand-700" : done ? "text-zinc-600" : "text-zinc-400"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-brand-600 text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {s.label}
                </span>
                {i === 0 && <span className="h-px w-6 bg-zinc-200" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>

        {step === "address" ? (
          <form onSubmit={handleAddress} className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Correo electrónico</span>
              <input type="email" required autoComplete="email" className="input mt-1" {...field("email")} />
            </label>
            <label>
              <span className="text-sm font-medium text-zinc-700">Nombre</span>
              <input required autoComplete="given-name" className="input mt-1" {...field("first_name")} />
            </label>
            <label>
              <span className="text-sm font-medium text-zinc-700">Apellido</span>
              <input required autoComplete="family-name" className="input mt-1" {...field("last_name")} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Celular</span>
              <input type="tel" required autoComplete="tel" className="input mt-1" {...field("phone")} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Dirección</span>
              <input required autoComplete="address-line1" placeholder="Calle 00 # 00-00" className="input mt-1" {...field("address_1")} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Apartamento, torre, barrio (opcional)</span>
              <input autoComplete="address-line2" className="input mt-1" {...field("address_2")} />
            </label>
            <label>
              <span className="text-sm font-medium text-zinc-700">Ciudad</span>
              <input required autoComplete="address-level2" className="input mt-1" {...field("city")} />
            </label>
            <label>
              <span className="text-sm font-medium text-zinc-700">Departamento</span>
              {stateOptions.length > 0 ? (
                <select required className="input mt-1" {...field("state")}>
                  <option value="">Selecciona…</option>
                  {stateOptions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input required className="input mt-1" {...field("state")} />
              )}
            </label>
            <label>
              <span className="text-sm font-medium text-zinc-700">Código postal (opcional)</span>
              <input autoComplete="postal-code" className="input mt-1" {...field("postcode")} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-zinc-700">Notas del pedido (opcional)</span>
              <textarea rows={2} className="input mt-1" {...field("note")} />
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button disabled={pending} className="btn btn-primary btn-lg w-full sm:col-span-2">
              {pending ? "Calculando envío…" : "Continuar"}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="card p-4 text-sm">
              <div className="flex justify-between">
                <p className="font-semibold text-zinc-800">Enviar a</p>
                <button
                  onClick={() => setStep("address")}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Editar
                </button>
              </div>
              <p className="mt-2 text-zinc-600">
                {form.first_name} {form.last_name} · {form.phone}
                <br />
                {form.address_1} {form.address_2}
                <br />
                {form.city}, {states[form.state] ?? form.state}
                <br />
                {form.email}
              </p>
            </div>

            {cart.needs_shipping &&
              cart.shipping_rates.map((pkg) => (
                <fieldset key={pkg.package_id} className="card p-4">
                  <legend className="px-1 text-sm font-semibold text-zinc-800">Método de envío</legend>
                  {pkg.shipping_rates.length === 0 && (
                    <p className="text-sm text-red-600">
                      No hay envíos disponibles para esta dirección.
                    </p>
                  )}
                  {pkg.shipping_rates.map((rate) => (
                    <label
                      key={rate.rate_id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm hover:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        name={`shipping-${pkg.package_id}`}
                        checked={rate.selected}
                        disabled={pending}
                        onChange={() =>
                          mutate("select-shipping-rate", {
                            package_id: pkg.package_id,
                            rate_id: rate.rate_id,
                          })
                        }
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="flex-1">{rate.name}</span>
                      <span className="font-medium">{formatPrice(rate.price, rate)}</span>
                    </label>
                  ))}
                </fieldset>
              ))}

            {(payError || error) && <p className="text-sm text-red-600">{payError || error}</p>}

            <button
              onClick={handlePay}
              disabled={paying || pending}
              className="btn btn-accent btn-lg w-full"
            >
              {paying
                ? "Redirigiendo a Wompi…"
                : `Pagar ${formatPrice(cart.totals.total_price, cart.totals)} con Wompi`}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Serás redirigido a Wompi para pagar con tarjeta, PSE, Nequi o Bancolombia.
            </p>
          </div>
        )}
      </section>

      <aside className="card h-fit space-y-4 p-6">
        <ul className="space-y-2 text-sm">
          {cart.items.map((item) => (
            <li key={item.key} className="flex justify-between gap-4">
              <span className="text-zinc-700">
                {item.name} × {item.quantity}
                {item.variation.length > 0 && (
                  <span className="block text-xs text-zinc-500">{variationLabel(item.variation)}</span>
                )}
              </span>
              <span className="shrink-0 text-zinc-800">
                {formatPrice(item.totals.line_subtotal, item.totals)}
              </span>
            </li>
          ))}
        </ul>
        <CartSummary cart={cart} />
      </aside>
    </div>
  );
}
