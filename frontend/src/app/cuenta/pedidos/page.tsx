import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerOrders, getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mis pedidos" };

// Página por-usuario: depende de la sesión (cookie), no se prerenderiza.
export const instant = false;

function money(total: string, currency: string) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(total) || 0);
  } catch {
    return `$${total}`;
  }
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  "on-hold": "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-200 text-zinc-600",
  refunded: "bg-zinc-200 text-zinc-600",
};

export default async function PedidosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");

  const orders = await getCustomerOrders();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cuenta" className="chip w-fit">
        ← Mi cuenta
      </Link>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Mis pedidos</h1>

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-zinc-500">
          Todavía no tienes pedidos.{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            Ir a comprar
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-zinc-800">Pedido #{order.number}</span>
                  {order.date && <span className="ml-2 text-sm text-zinc-500">{order.date}</span>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[order.status] ?? "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {order.status_label}
                </span>
              </div>
              {order.items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                  {order.items.map((item, i) => (
                    <li key={`${order.id}-${i}`}>
                      {item.quantity} × {item.name}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-zinc-100 pt-3 text-right font-semibold text-zinc-800">
                Total: {money(order.total, order.currency)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
