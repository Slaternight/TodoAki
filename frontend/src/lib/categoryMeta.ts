// Ícono (emoji) y color de fondo por categoría, para la navegación y la home.
// Se busca por nombre; si no está, usa un valor por defecto.

type Meta = { icon: string; tint: string };

const CATEGORY_META: Record<string, Meta> = {
  Tecnología: { icon: "💻", tint: "bg-brand-100 text-brand-700" },
  Hogar: { icon: "🏠", tint: "bg-emerald-100 text-emerald-700" },
  Cocina: { icon: "🍳", tint: "bg-accent-100 text-accent-700" },
  Herramientas: { icon: "🔧", tint: "bg-zinc-200 text-zinc-700" },
  Juguetes: { icon: "🧸", tint: "bg-pink-100 text-pink-700" },
  Papelería: { icon: "✏️", tint: "bg-amber-100 text-amber-700" },
  "Bolsos y Morrales": { icon: "🎒", tint: "bg-indigo-100 text-indigo-700" },
  Accesorios: { icon: "🕶️", tint: "bg-violet-100 text-violet-700" },
  Buzos: { icon: "🧥", tint: "bg-sky-100 text-sky-700" },
  Camisetas: { icon: "👕", tint: "bg-rose-100 text-rose-700" },
  Ropa: { icon: "👕", tint: "bg-rose-100 text-rose-700" },
  Varios: { icon: "✨", tint: "bg-teal-100 text-teal-700" },
};

const DEFAULT_META: Meta = { icon: "🛍️", tint: "bg-brand-100 text-brand-700" };

export function categoryMeta(name: string): Meta {
  return CATEGORY_META[name] ?? DEFAULT_META;
}

export function categoryIcon(name: string): string {
  return categoryMeta(name).icon;
}
