import type { Product } from "@/lib/types";

// WooCommerce devuelve "N/D" (y variantes) cuando no hay peso/medidas; lo tratamos como vacío.
function cleanSpec(value?: string) {
  const v = (value ?? "").trim();
  return v && !/^(n\/?d|n\/?a|-|—|sin dato)$/i.test(v) ? v : "";
}

// Ficha técnica: tabla con los datos del producto que sí tenemos
// (categoría, atributos, referencia, peso/medidas si existen, disponibilidad).
// Cada fila se muestra solo si tiene valor, así nunca queda vacía.
export function ProductSpecs({ product }: { product: Product }) {
  const rows: { label: string; value: string }[] = [];

  if (product.categories.length > 0) {
    rows.push({ label: "Categoría", value: product.categories.map((c) => c.name).join(", ") });
  }
  for (const spec of product.specs ?? []) {
    const value = cleanSpec(spec.value);
    if (value) rows.push({ label: spec.label, value });
  }
  for (const attr of product.attributes) {
    if (attr.terms.length > 0) {
      rows.push({ label: attr.name, value: attr.terms.map((t) => t.name).join(", ") });
    }
  }
  if (product.sku) {
    rows.push({ label: "Referencia", value: product.sku });
  }
  const peso = cleanSpec(product.formatted_weight);
  if (peso) {
    rows.push({ label: "Peso", value: peso });
  }
  const dimensiones = cleanSpec(product.formatted_dimensions);
  if (dimensiones) {
    rows.push({ label: "Dimensiones", value: dimensiones });
  }
  rows.push({ label: "Disponibilidad", value: product.is_in_stock ? "En stock" : "Agotado" });

  if (rows.length === 0) return null;

  return (
    <div className="border-t border-zinc-200 pt-6">
      <h2 className="mb-3 font-display text-lg font-bold">Ficha técnica</h2>
      <dl className="overflow-hidden rounded-xl border border-zinc-200">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-zinc-50/70" : "bg-white"}`}
          >
            <dt className="w-32 shrink-0 font-medium text-zinc-500">{row.label}</dt>
            <dd className="font-medium text-zinc-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
