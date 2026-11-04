"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useState } from "react";
import type { Product, ProductVariation } from "@/lib/types";
import { Price } from "./Price";

// Estado de la ficha de producto: qué talla/color eligió el cliente y a qué
// variación corresponde. Lo comparten la imagen, el precio, el selector y el
// botón de agregar al carrito.

type Selection = Record<string, string>; // nombre del atributo -> slug del término

type ProductPurchaseValue = {
  product: Product;
  selection: Selection;
  select: (attribute: string, value: string) => void;
  // Atributos que faltan por elegir ("Talla").
  missing: string[];
  // La variación de la selección completa; null si falta elegir o la combinación no existe.
  variation: ProductVariation | null;
  // Para la imagen: la variación exacta o, con selección parcial, la primera compatible.
  preview: ProductVariation | null;
  isAvailable: (attribute: string, value: string) => boolean;
};

const ProductPurchaseContext = createContext<ProductPurchaseValue | null>(null);

// Un valor vacío en la variación significa "cualquiera"; un atributo sin elegir no filtra.
function isCompatible(attributes: Product["variations"][number]["attributes"], selection: Selection) {
  return attributes.every(
    (a) => !a.value || !selection[a.name] || selection[a.name] === a.value,
  );
}

export function ProductPurchaseProvider({
  product,
  variations,
  children,
}: {
  product: Product;
  variations: ProductVariation[];
  children: React.ReactNode;
}) {
  const options = product.attributes.filter((a) => a.has_variations);
  const [selection, setSelection] = useState<Selection>(() => {
    // Valores por defecto configurados en WooCommerce (p. ej. Color: Negro).
    const defaults: Selection = {};
    for (const attribute of options) {
      const term = attribute.terms.find((t) => t.default);
      if (term) defaults[attribute.name] = term.slug;
    }
    return defaults;
  });

  const byId = new Map(variations.map((v) => [v.id, v]));
  const missing = options.filter((a) => !selection[a.name]).map((a) => a.name);
  const compatible = product.variations.filter((v) => isCompatible(v.attributes, selection));
  const firstCompatible = compatible[0] ? (byId.get(compatible[0].id) ?? null) : null;
  const variation = missing.length === 0 ? firstCompatible : null;
  const preview = Object.keys(selection).length > 0 ? firstCompatible : null;

  const value: ProductPurchaseValue = {
    product,
    selection,
    select: (attribute, term) => setSelection((s) => ({ ...s, [attribute]: term })),
    missing,
    variation,
    preview,
    isAvailable: (attribute, term) =>
      product.variations.some(
        (v) =>
          byId.get(v.id)?.is_in_stock &&
          isCompatible(v.attributes, { ...selection, [attribute]: term }),
      ),
  };

  return <ProductPurchaseContext.Provider value={value}>{children}</ProductPurchaseContext.Provider>;
}

export function useProductPurchase() {
  const ctx = useContext(ProductPurchaseContext);
  if (!ctx) throw new Error("useProductPurchase debe usarse dentro de <ProductPurchaseProvider>");
  return ctx;
}

// Galería: foto principal grande + tira de miniaturas con todas las fotos del
// producto. Si el color elegido trae su propia foto, la galería salta a ella.
export function ProductGallery() {
  const { product, preview } = useProductPurchase();
  const images = product.images;
  const previewSrc = preview?.images[0]?.src;
  const [activeSrc, setActiveSrc] = useState<string | null>(images[0]?.src ?? null);

  // Al elegir un color que tiene foto propia, muestra esa foto.
  useEffect(() => {
    if (previewSrc) setActiveSrc(previewSrc);
  }, [previewSrc]);

  const active =
    images.find((i) => i.src === activeSrc) ?? preview?.images[0] ?? images[0] ?? null;
  if (!active) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200/70 bg-white">
        <Image
          src={active.src}
          alt={active.alt || product.name}
          fill
          preload
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-contain"
        />
        {product.on_sale && (
          <span className="absolute left-4 top-4 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
            Oferta
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img) => {
            const isActive = img.src === active.src;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveSrc(img.src)}
                aria-label={`Ver foto de ${product.name}`}
                aria-pressed={isActive}
                className={`relative aspect-square overflow-hidden rounded-xl border bg-white transition ${
                  isActive
                    ? "border-brand-600 ring-2 ring-brand-600/20"
                    : "border-zinc-200 hover:border-brand-400"
                }`}
              >
                <Image src={img.thumbnail || img.src} alt="" fill sizes="80px" className="object-contain" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductPrice({ className }: { className?: string }) {
  const { product, variation } = useProductPurchase();
  return <Price prices={(variation ?? product).prices} className={className} />;
}

export function VariationPicker() {
  const { product, selection, select, isAvailable } = useProductPurchase();
  const options = product.attributes.filter((a) => a.has_variations);
  if (options.length === 0) return null;

  return (
    <div className="space-y-4">
      {options.map((attribute) => {
        const selected = attribute.terms.find((t) => t.slug === selection[attribute.name]);
        return (
          <fieldset key={attribute.name}>
            <legend className="mb-2 text-sm font-semibold text-zinc-800">
              {attribute.name}
              {selected && <span className="font-normal text-zinc-500">: {selected.name}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {attribute.terms.map((term) => {
                const active = term.slug === selection[attribute.name];
                const available = isAvailable(attribute.name, term.slug);
                return (
                  <button
                    key={term.slug}
                    type="button"
                    aria-pressed={active}
                    title={available ? undefined : "Agotado"}
                    onClick={() => select(attribute.name, term.slug)}
                    className={`min-w-12 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-zinc-300 text-zinc-700 hover:border-brand-500 hover:text-brand-700"
                    } ${available ? "" : "line-through opacity-40"}`}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
