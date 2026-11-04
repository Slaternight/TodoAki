// Clasifica los productos importados en categorías generales de la tienda
// (proyecto nuevo "de todo de China a Colombia"), por el nombre/función.
// Lee docker/shopify-products.json y escribe docker/product-categories.json
// con { shopify_id, category } para que lo aplique import-categories.php.
//
//   node docker/classify.mjs
//
// Reglas: se evalúan EN ORDEN; gana la primera categoría cuyo patrón aparezca
// en el nombre. Así "Mug Viajero" cae en Cocina (mug) y "Esfero Emoji" en
// Papelería (esfero), aunque compartan palabras con otras categorías.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const products = JSON.parse(
  (await import("node:fs")).readFileSync(join(here, "shopify-products.json"), "utf8"),
);

const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// [categoría, patrón]. El orden es la prioridad.
const RULES = [
  ["Papelería", /\b(esfero|boligrafo|lapic|lapiz|portamina|agenda|libreta|cuaderno|cartuchera|cosedora|grapadora|resaltador|marcador|micropunta|borrador|sacapunta|regla\b|carpeta|pegante|colbon|post ?it|tablero|papeleria|escolar|calculadora|carton|cartulina|calendario|estuche)/],
  ["Accesorios", /\b(llaver|portacarnet|carnet|lanyard|escarapela|manilla|pulsera|prendedor|boton|iman|billetera|monedero|tarjetero|gafas|lentes|cordon|gorra|cosmetiquer)/],
  ["Bolsos y Morrales", /\b(morral|bolso|bolsa|tula|maleta|maletin|canguro|mochila|kambrel|cava\b|mercado)/],
  ["Cocina", /\b(mug|vaso|pocillo|termo|botilito|botella|cantimplora|vajilla|plato|cubierto|cuchara|tenedor|olla|sarten|pitillo|destapador|lonchera|aceitera|jarra|jarro|hielera|nevera|portacomida|bandeja|molde|reposteria|cafetera|licuadora|batidora|exprimidor|rallador|portavaso|cervecero|colador|cortador|escurridor|espumadera|estufa|horno|\bwok\b|freidora|sanduchera|tetera|cuchillo|lavaplatos|cocina)/],
  ["Herramientas", /\b(herramient|destornillador|atornillador|taladro|alicate|martillo|flexometro|metro\b|\bnivel\b|navaja|cuchilla|machete|soldador|multiherramienta|tornillo|tuerca|arandela|broca|\blija\b|pinza|cautin|calibrador|carretilla|balinera|buje|anclaje|chuzo|trafico|\basta\b|abrazadera|bisagra|cerradura|candado|manija|ferreteria)/],
  ["Tecnología", /\b(celular|smartphone|usb|bluetooth|parlante|audifono|auricular|cargador|cable|power ?bank|bateria|\bpila|mouse|teclado|memoria|microfono|camara|webcam|ventilador|linterna|reflector|reloj|smartwatch|tablet|soporte|\bpad\b|adaptador|\bhub\b|diadema|aro de luz|manos libres)/],
  ["Juguetes", /\b(ju\d+|juguet|volqueta|carro|carrito|camion|\bmoto\b|balon|pelota|futbol|rompecabeza|didactic|cubo|bloques|lego|muneca|peluche|antiestres|globos|burbuja|plastilina|colorear|\bjuego|domino|parques|ajedrez|yoyo|trompo|patineta|triciclo|armatodo|armotodo|armo |block|builder|montable|soplado|articulado|coche|castillo|cocodrilo)/],
  ["Hogar", /\b(espejo|adorno|cuadro|retrato|marco\b|florero|maceta|matera|\bvela|cojin|almohada|cobija|manta|sabana|toalla|cortina|tapete|alfombra|organizador|percha|gancho|canasta|canasto|cesta|alcancia|sombrilla|paraguas|abanico|dispensador|jabonera|cepillo|escoba|trapero|balde|halloween|navid|guirnalda|luces|lampara|\bluz\b|neon|bombillo|panel|wpc|esquinero|bocel|liston|guardaescoba|pared|bano|maquillaje|cosmetiquero|brocha|mascota|velador|humidificador|difusor|ventosa|aspiradora|atomizador|deco\b|chimenea|ganchera|exhibidor|cebo|roedor|desague|repisa|estante|joyero|follaje|cofre|globo chino)/],
];

const counts = {};
const varios = [];
const mapping = products.map((p) => {
  const t = norm(p.title);
  const rule = RULES.find(([, re]) => re.test(t));
  const category = rule ? rule[0] : "Varios";
  counts[category] = (counts[category] || 0) + 1;
  if (!rule) varios.push(p.title);
  return { shopify_id: p.shopify_id, category };
});

writeFileSync(join(here, "product-categories.json"), JSON.stringify(mapping, null, 2));

console.log("Reparto por categoría:");
for (const [cat, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${cat}`);
}
console.log(`\nSin clasificar (Varios): ${varios.length}`);
console.log("Muestra de Varios:");
console.log(varios.slice(0, 40).map((t) => "  - " + t).join("\n"));
