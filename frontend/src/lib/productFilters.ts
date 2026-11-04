// Filtros de catálogo compartidos entre la página de categoría y /api/products.
// Los valores viven en la URL (?orden=&min=&max=&oferta=1&stock=1) para que
// sean compartibles, y se mapean a los parámetros de la Store API.

export type FilterValues = {
  orden: string; // "reciente" | "precio-asc" | "precio-desc" | "nombre"
  min: string;
  max: string;
  oferta: boolean;
  stock: boolean;
};

const ORDEN_MAP: Record<string, { orderby?: string; order?: "asc" | "desc" }> = {
  reciente: {}, // por defecto: lo más nuevo (date desc)
  "precio-asc": { orderby: "price", order: "asc" },
  "precio-desc": { orderby: "price", order: "desc" },
  nombre: { orderby: "title", order: "asc" },
};

export function readFilters(get: (key: string) => string | null | undefined): FilterValues {
  const g = (k: string) => (get(k) ?? "").toString();
  return {
    orden: g("orden") || "reciente",
    min: g("min"),
    max: g("max"),
    oferta: g("oferta") === "1",
    stock: g("stock") === "1",
  };
}

// Convierte los filtros de la URL en opciones para getProductsPage (Store API).
export function filtersToQuery(f: FilterValues) {
  const num = (s: string) => {
    const n = Number(s.replace(/\D/g, "")); // admite "1.000"
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const orden = ORDEN_MAP[f.orden] ?? {};
  return {
    orderby: orden.orderby,
    order: orden.order,
    minPrice: num(f.min),
    maxPrice: num(f.max),
    onSale: f.oferta || undefined,
    stockStatus: f.stock ? "instock" : undefined,
  };
}

// Serializa los filtros activos a querystring (para la paginación "Cargar más").
export function filtersToParams(f: FilterValues): string {
  const sp = new URLSearchParams();
  if (f.orden && f.orden !== "reciente") sp.set("orden", f.orden);
  if (f.min) sp.set("min", f.min);
  if (f.max) sp.set("max", f.max);
  if (f.oferta) sp.set("oferta", "1");
  if (f.stock) sp.set("stock", "1");
  return sp.toString();
}
