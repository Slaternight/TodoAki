// Importa el catálogo de la tienda Shopify de Boton Promo a la tienda local.
// Paso 1 de 2: DESCARGA. El token NUNCA se escribe en el código ni se sube al
// repositorio: se lee de las variables de entorno SHOPIFY_STORE y SHOPIFY_TOKEN
// (definidas en tienda-headless/.env, que está en .gitignore).
//
//   node docker/import-shopify.mjs
//
// Deja el catálogo en docker/shopify-products.json. Luego el paso 2 lo carga:
//   docker compose run --rm wpcli wp eval-file /setup/import-shopify.php

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const store = process.env.SHOPIFY_STORE?.trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const token = process.env.SHOPIFY_TOKEN?.trim();

if (!store || !token) {
  console.error(
    "Faltan SHOPIFY_STORE y/o SHOPIFY_TOKEN. Ponlos en tienda-headless/.env (no en el código).",
  );
  process.exit(1);
}

const API = `https://${store}/admin/api/2024-07`;
const headers = { "X-Shopify-Access-Token": token, Accept: "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shopify pagina con el encabezado Link: <...page_info=XXX>; rel="next".
function nextPageInfo(linkHeader) {
  const match = /<[^>]*[?&]page_info=([^>&]+)[^>]*>;\s*rel="next"/.exec(linkHeader ?? "");
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchAllProducts() {
  const all = [];
  let url = `${API}/products.json?limit=250`;
  for (let page = 1; url; page++) {
    const res = await fetch(url, { headers });
    if (res.status === 401) {
      throw new Error("401: el token de Shopify no es válido o no tiene permiso para leer productos.");
    }
    if (res.status === 404) {
      throw new Error(`404: la tienda ${store} no existe o la ruta es incorrecta.`);
    }
    if (!res.ok) {
      throw new Error(`Shopify respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const { products } = await res.json();
    all.push(...products);
    console.log(`  página ${page}: ${products.length} productos (total ${all.length})`);
    const pageInfo = nextPageInfo(res.headers.get("link"));
    url = pageInfo ? `${API}/products.json?limit=250&page_info=${encodeURIComponent(pageInfo)}` : null;
    if (url) await sleep(600); // respeta el límite de peticiones de Shopify
  }
  return all;
}

// Deja solo los campos que necesita el cargador de WooCommerce.
function normalize(p) {
  // Shopify pone una opción "Title: Default Title" en los productos sin variantes reales.
  const realOptions = (p.options ?? []).filter(
    (o) => !(o.values.length === 1 && /^(default title|title)$/i.test(o.values[0])),
  );
  return {
    shopify_id: p.id,
    handle: p.handle,
    title: p.title,
    body_html: p.body_html ?? "",
    vendor: p.vendor ?? "",
    product_type: p.product_type ?? "",
    tags:
      typeof p.tags === "string"
        ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    status: p.status, // active | draft | archived
    options: realOptions.map((o) => ({ name: o.name, values: o.values })),
    images: (p.images ?? []).map((img) => ({ id: img.id, src: img.src, alt: img.alt ?? "" })),
    variants: (p.variants ?? []).map((v) => ({
      shopify_id: v.id,
      sku: v.sku ?? "",
      price: v.price,
      compare_at_price: v.compare_at_price,
      options: realOptions.map((o, i) => ({ name: o.name, value: v[`option${i + 1}`] })),
      inventory_quantity: v.inventory_quantity,
      inventory_management: v.inventory_management, // "shopify" o null
      image_id: v.image_id,
    })),
  };
}

console.log(`Descargando productos de ${store}…`);
const normalized = (await fetchAllProducts()).map(normalize);

const outFile = join(dirname(fileURLToPath(import.meta.url)), "shopify-products.json");
writeFileSync(outFile, JSON.stringify(normalized, null, 2));

const variable = normalized.filter((p) => p.options.length > 0).length;
console.log(
  `\nListo: ${normalized.length} productos (${variable} con variaciones, ${normalized.length - variable} simples).`,
);
console.log(`Guardado en ${outFile}`);
console.log("Ahora cárgalos: docker compose run --rm wpcli wp eval-file /setup/import-shopify.php");
