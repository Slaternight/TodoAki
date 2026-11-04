// Descarga los metacampos (metafields) de cada producto desde Shopify y los
// agrega como `specs` a docker/shopify-products.json, para la ficha técnica.
// Excluye marcación (impresión), flete, envío y disclosures.
//
//   set -a; . ./.env; set +a
//   node docker/fetch-metafields.mjs
//   Prueba sin guardar:  METAFIELDS_LIMIT=15 DRY_RUN=1 node docker/fetch-metafields.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_TOKEN;
if (!STORE || !TOKEN) {
  console.error("Faltan SHOPIFY_STORE / SHOPIFY_TOKEN en el entorno (ejecuta: set -a; . ./.env; set +a).");
  process.exit(1);
}

const API = "2024-07";
const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "shopify-products.json");

const LIMIT = Number(process.env.METAFIELDS_LIMIT) || 0; // 0 = todos
const DRY = process.env.DRY_RUN === "1";

// Se excluye por palabra clave en la "key" del metacampo (marcación y logística).
const EXCLUDE = /impresion|flete|env[ií]o|disclosure/i;

// Etiquetas bonitas para algunas keys; el resto se arma desde la propia key.
const LABELS = {
  capacidad_potencia: "Capacidad / Potencia",
  gramaje_aprox: "Gramaje aprox.",
  tipo_de_mina: "Tipo de mina",
  tipo_de_tinta: "Tipo de tinta",
  empaque_individual: "Empaque individual",
  diametro: "Diámetro",
};

const TEXT_TYPES = new Set([
  "single_line_text_field",
  "multi_line_text_field",
  "number_integer",
  "number_decimal",
]);

function labelFor(key) {
  if (LABELS[key]) return LABELS[key];
  const s = key.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchMetafields(productId, attempt = 0) {
  const url = `https://${STORE}/admin/api/${API}/products/${productId}/metafields.json`;
  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": TOKEN } });
  if (res.status === 429 && attempt < 5) {
    const wait = Number(res.headers.get("Retry-After")) || 2;
    await sleep(wait * 1000);
    return fetchMetafields(productId, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.metafields || [];
}

function toSpecs(metafields) {
  const specs = [];
  for (const m of metafields) {
    if (m.namespace !== "custom") continue;
    if (EXCLUDE.test(m.key)) continue;
    if (!TEXT_TYPES.has(m.type)) continue;
    const value = typeof m.value === "string" ? m.value.trim() : "";
    if (!value) continue;
    specs.push({ label: labelFor(m.key), value });
  }
  return specs;
}

const products = JSON.parse(readFileSync(file, "utf8"));
const list = LIMIT > 0 ? products.slice(0, LIMIT) : products;

let conSpecs = 0;
let totalSpecs = 0;
let errores = 0;

for (let i = 0; i < list.length; i++) {
  const p = list[i];
  try {
    const specs = toSpecs(await fetchMetafields(p.shopify_id));
    p.specs = specs;
    if (specs.length) {
      conSpecs++;
      totalSpecs += specs.length;
    }
  } catch (e) {
    errores++;
    p.specs = p.specs || [];
    console.warn(`  ! ${p.title}: ${e.message}`);
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${list.length}…`);
  await sleep(250); // respeta el límite de Shopify
}

console.log(
  `\nProductos con ficha: ${conSpecs}/${list.length} | metacampos: ${totalSpecs} | errores: ${errores}`,
);

if (DRY) {
  console.log("\n(DRY_RUN: no se guardó el archivo). Muestra de los primeros con ficha:");
  let shown = 0;
  for (const p of list) {
    if (!p.specs?.length) continue;
    console.log(`\n# ${p.title}`);
    for (const s of p.specs) console.log(`   - ${s.label}: ${s.value}`);
    if (++shown >= 6) break;
  }
} else {
  writeFileSync(file, JSON.stringify(products, null, 2));
  console.log(`\nGuardado en ${file}`);
}
