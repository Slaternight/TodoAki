// Tipos de la WooCommerce Store API (/wp-json/wc/store/v1).
// Solo incluyen los campos que usa este front; la API devuelve más.

export type Currency = {
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
};

// Los montos llegan como string en unidades mínimas (ej. "1500000" con minor_unit 2 = 15.000,00).
export type Prices = Currency & {
  price: string;
  regular_price: string;
  sale_price: string;
  // Solo en productos variables cuyas variaciones tienen precios distintos.
  price_range?: { min_amount: string; max_amount: string } | null;
};

export type ProductImage = {
  id: number;
  src: string;
  thumbnail: string;
  name: string;
  alt: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

// Atributo de un producto variable (Talla, Color...). En los atributos globales
// (taxonomy "pa_talla") el slug del término es el valor; en los propios del
// producto, el slug es el mismo nombre ("Negro").
export type ProductAttribute = {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: { id: number; name: string; slug: string; default?: boolean }[];
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  type: string;
  sku: string;
  // Vienen de WooCommerce ya formateados (ej. "0,5 kg", "20 × 7 × 7 cm"); "" si no hay dato.
  formatted_weight?: string;
  formatted_dimensions?: string;
  // Ficha técnica (metacampos de Shopify), inyectada por el plugin tienda-headless.
  specs?: { label: string; value: string }[];
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: Prices;
  images: ProductImage[];
  categories: Pick<Category, "id" | "name" | "slug">[];
  is_purchasable: boolean;
  is_in_stock: boolean;
  add_to_cart: {
    text: string;
    minimum: number;
    maximum: number;
    multiple_of: number;
  };
  attributes: ProductAttribute[];
  // Qué valor de cada atributo tiene cada variación. value vacío = "cualquiera".
  variations: { id: number; attributes: { name: string; value: string | null }[] }[];
};

// Cada variación es un producto propio en la Store API, con su precio, stock e imagen.
export type ProductVariation = Pick<
  Product,
  "id" | "prices" | "images" | "is_purchasable" | "is_in_stock" | "add_to_cart"
>;

export type CartItem = {
  key: string;
  id: number;
  quantity: number;
  name: string;
  images: ProductImage[];
  prices: Prices;
  totals: Currency & {
    line_subtotal: string;
    line_total: string;
  };
  quantity_limits: {
    minimum: number;
    maximum: number;
    multiple_of: number;
    editable: boolean;
  };
  // Talla, color... de la variación elegida, con los nombres para mostrar ("Talla: M").
  variation: { attribute: string; value: string }[];
};

export type ShippingRate = Currency & {
  rate_id: string;
  name: string;
  price: string;
  selected: boolean;
};

export type ShippingPackage = {
  package_id: number;
  name: string;
  shipping_rates: ShippingRate[];
};

export type Address = {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
};

export type BillingAddress = Address & { email: string };

export type Cart = {
  items: CartItem[];
  items_count: number;
  needs_shipping: boolean;
  coupons: { code: string }[];
  shipping_rates: ShippingPackage[];
  billing_address: BillingAddress;
  shipping_address: Address;
  totals: Currency & {
    total_items: string;
    total_discount: string;
    total_shipping: string | null;
    total_tax: string;
    total_price: string;
  };
};

// Errores de la Store API: { code, message, data: { status } }
export type StoreApiError = {
  code: string;
  message: string;
};
