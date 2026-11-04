import { formatPrice } from "@/lib/format";
import type { Cart } from "@/lib/types";

// Totales del carrito; se usa en /carrito y en /checkout.
export function CartSummary({ cart }: { cart: Cart }) {
  const { totals } = cart;
  const discount = Number(totals.total_discount) > 0;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt>Subtotal</dt>
        <dd>{formatPrice(totals.total_items, totals)}</dd>
      </div>
      {discount && (
        <div className="flex justify-between text-green-700">
          <dt>Descuento</dt>
          <dd>-{formatPrice(totals.total_discount, totals)}</dd>
        </div>
      )}
      {cart.needs_shipping && (
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>
            {totals.total_shipping === null
              ? "Se calcula en el checkout"
              : formatPrice(totals.total_shipping, totals)}
          </dd>
        </div>
      )}
      {Number(totals.total_tax) > 0 && (
        <div className="flex justify-between">
          <dt>Impuestos</dt>
          <dd>{formatPrice(totals.total_tax, totals)}</dd>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-zinc-200 pt-3 text-lg font-bold text-zinc-900">
        <dt>Total</dt>
        <dd>{formatPrice(totals.total_price, totals)}</dd>
      </div>
    </dl>
  );
}
