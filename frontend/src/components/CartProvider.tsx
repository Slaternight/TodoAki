"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { decodeEntities } from "@/lib/format";
import type { Cart, StoreApiError } from "@/lib/types";

type CartAction =
  | "add-item"
  | "update-item"
  | "remove-item"
  | "apply-coupon"
  | "remove-coupon"
  | "update-customer"
  | "select-shipping-rate";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  pending: boolean;
  error: string | null;
  mutate: (action: CartAction, body: object) => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) setCart(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(async (action: CartAction, body: object) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cart/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data as StoreApiError | null)?.message;
        setError(message ? decodeEntities(message) : "No se pudo actualizar el carrito.");
        return false;
      }
      setCart(data as Cart);
      return true;
    } catch {
      setError("No hay conexión con la tienda. Intenta de nuevo.");
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(async () => {
    await fetch("/api/cart/reset", { method: "POST" });
    setCart(null);
    await refresh();
  }, [refresh]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <CartContext.Provider
      value={{ cart, loading, pending, error, mutate, refresh, reset, clearError }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
