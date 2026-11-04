import { formatPrice } from "@/lib/format";
import type { Prices } from "@/lib/types";

// El tamaño lo controla la clase del padre (text-base en tarjetas, text-xl en la ficha).
export function Price({ prices, className = "" }: { prices: Prices; className?: string }) {
  // Producto variable con precios distintos según la talla/color.
  if (prices.price_range) {
    return (
      <p className={className}>
        <span className="text-[0.7em] text-zinc-500">Desde </span>
        <span className="font-bold text-zinc-900">{formatPrice(prices.price_range.min_amount, prices)}</span>
      </p>
    );
  }

  const onSale = prices.price !== prices.regular_price;

  return (
    <p className={className}>
      <span className={`font-bold ${onSale ? "text-accent-600" : "text-zinc-900"}`}>
        {formatPrice(prices.price, prices)}
      </span>
      {onSale && (
        <span className="ml-2 text-[0.8em] font-medium text-zinc-400 line-through">
          {formatPrice(prices.regular_price, prices)}
        </span>
      )}
    </p>
  );
}
