import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import type { Category, Product, ProductVariation } from "./types";

// Todo lo que habla con WordPress pasa por aquí y solo corre en el servidor.
// El navegador nunca llama a WordPress directamente: usa las rutas /api/* de Next.

const CART_COOKIE = "wc_cart_token";

export function wpUrl(path: string) {
  const base = process.env.WC_STORE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Falta la variable de entorno WC_STORE_URL (ver .env.example)");
  }
  return `${base}/wp-json${path}`;
}

const storeApi = (path: string) => wpUrl(`/wc/store/v1${path}`);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`WooCommerce respondió ${res.status} en ${url}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Catálogo (cacheado). El plugin de WordPress invalida el tag "products" al
// guardar un producto o cambiar su stock (ver /api/revalidate).
// ---------------------------------------------------------------------------

export async function getProducts(options: { categoryId?: number; perPage?: number } = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const qs = new URLSearchParams({ per_page: String(options.perPage ?? 24) });
  if (options.categoryId) qs.set("category", String(options.categoryId));
  return getJson<Product[]>(storeApi(`/products?${qs}`));
}

// Como getProducts pero devuelve también el total (de los headers X-WP-*),
// para paginar con el botón "Cargar más".
export async function getProductsPage(
  options: {
    categoryId?: number;
    page?: number;
    perPage?: number;
    search?: string;
    orderby?: string;
    order?: "asc" | "desc";
    minPrice?: number;
    maxPrice?: number;
    onSale?: boolean;
    stockStatus?: string;
  } = {},
) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const perPage = options.perPage ?? 24;
  const page = options.page ?? 1;
  const qs = new URLSearchParams({ per_page: String(perPage), page: String(page) });
  if (options.categoryId) qs.set("category", String(options.categoryId));
  if (options.search) qs.set("search", options.search);
  if (options.orderby) qs.set("orderby", options.orderby);
  if (options.order) qs.set("order", options.order);
  if (options.minPrice != null) qs.set("min_price", String(options.minPrice));
  if (options.maxPrice != null) qs.set("max_price", String(options.maxPrice));
  if (options.onSale) qs.set("on_sale", "true");
  if (options.stockStatus) qs.set("stock_status", options.stockStatus);

  const res = await fetch(storeApi(`/products?${qs}`), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`WooCommerce respondió ${res.status} al listar productos`);
  }
  const products = (await res.json()) as Product[];
  const total = Number(res.headers.get("X-WP-Total")) || products.length;
  const totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
  return { products, total, totalPages };
}

// Búsqueda por nombre (autocompletado y /buscar). Usa el endpoint del plugin
// que prioriza el inicio de palabra, y trae los datos completos de la Store API.
export async function searchProductsPage(options: { query: string; page?: number; perPage?: number }) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const query = options.query.trim();
  const perPage = options.perPage ?? 24;
  const page = options.page ?? 1;
  if (query.length < 2) return { products: [] as Product[], total: 0 };

  const ranked = await getJson<{ results: { id: number; name: string; slug: string }[]; total: number }>(
    wpUrl(`/tienda-headless/v1/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`),
  );
  if (ranked.results.length === 0) return { products: [] as Product[], total: ranked.total };

  const ids = ranked.results.map((r) => r.id);
  const products = await getJson<Product[]>(
    storeApi(`/products?include=${ids.join(",")}&per_page=${ids.length}`),
  );
  // La Store API no respeta el orden de `include`; reordenamos como vino del ranking.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  return { products: ordered, total: ranked.total };
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const products = await getJson<Product[]>(
    storeApi(`/products?slug=${encodeURIComponent(slug)}`),
  );
  return products.find((p) => p.slug === slug) ?? null;
}

// Precio, stock e imagen de cada variación (talla, color...) de un producto variable.
export async function getProductVariations(productId: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  return getJson<ProductVariation[]>(
    storeApi(`/products?type=variation&parent=${productId}&per_page=100`),
  );
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const categories = await getJson<Category[]>(storeApi("/products/categories"));
  return categories.filter((c) => c.count > 0);
}

// Departamentos de Colombia con los códigos que espera WooCommerce.
// Los expone el plugin tienda-headless; si no está instalado, el checkout usa un campo de texto.
export async function getStates(country: string) {
  "use cache";
  cacheLife("hours");

  try {
    return await getJson<Record<string, string>>(
      wpUrl(`/tienda-headless/v1/states/${country}`),
    );
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Carrito y checkout (sin caché). La sesión del carrito en WooCommerce se
// identifica con el header Cart-Token, que guardamos en una cookie httpOnly.
// ---------------------------------------------------------------------------

async function newCartToken() {
  const res = await fetch(storeApi("/cart"), { cache: "no-store" });
  return res.headers.get("Cart-Token") ?? undefined;
}

export async function storeCartRequest(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
) {
  const method = init.method ?? "GET";
  const cookieStore = await cookies();
  let token = cookieStore.get(CART_COOKIE)?.value;

  const send = (cartToken?: string) =>
    fetch(storeApi(path), {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(cartToken ? { "Cart-Token": cartToken } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

  // Sin Cart-Token válido, WooCommerce exige un nonce en las peticiones que
  // modifican el carrito. Pedimos un token nuevo y reintentamos una vez.
  if (!token && method !== "GET") token = await newCartToken();
  let res = await send(token);
  if (method !== "GET" && (res.status === 401 || res.status === 403)) {
    token = await newCartToken();
    res = await send(token);
  }

  const nextToken = res.headers.get("Cart-Token");
  if (nextToken && nextToken !== cookieStore.get(CART_COOKIE)?.value) {
    cookieStore.set(CART_COOKIE, nextToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 2, // la sesión del carrito en WooCommerce dura 48 h
    });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// Tras un pago aprobado empezamos un carrito nuevo.
export async function resetCart() {
  (await cookies()).delete(CART_COOKIE);
}
