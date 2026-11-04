"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCart } from "./CartProvider";

// Pago aprobado: vaciamos el carrito (si fue rechazado lo conservamos para reintentar).
export function ResetCartOnMount() {
  const { reset } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    reset();
  }, [reset]);

  return null;
}

// PSE, Nequi y Bancolombia pueden quedar en PENDING unos segundos.
export function RefreshWhilePending() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
