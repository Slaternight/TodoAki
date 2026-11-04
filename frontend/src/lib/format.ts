import type { Currency } from "./types";

// Convierte un monto de la Store API (unidades mínimas) a texto: "$ 150.000".
export function formatPrice(
  amount: string | null | undefined,
  currency: Pick<Currency, "currency_code" | "currency_minor_unit">,
) {
  const digits = currency.currency_minor_unit;
  const value = Number(amount ?? 0) / 10 ** digits;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency.currency_code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// Las descripciones de WooCommerce vienen en HTML; para metadatos solo queremos texto.
export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Talla: M · Color: Negro" para mostrar debajo del nombre en el carrito.
export function variationLabel(variation: { attribute: string; value: string }[]) {
  return variation.map((v) => `${v.attribute}: ${v.value}`).join(" · ");
}

// Los mensajes de WooCommerce a veces traen entidades HTML (&quot;, &amp;...).
// Solo funciona en el navegador.
export function decodeEntities(text: string) {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}
