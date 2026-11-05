"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

// Enlace/menú de cuenta en el header: "Ingresar" si no hay sesión, o un menú
// con Mi cuenta / Mis pedidos / Cerrar sesión si la hay.
export function AccountMenu() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-zinc-100" aria-hidden />;
  }

  if (!user) {
    return (
      <Link href="/ingresar" className="btn btn-outline btn-sm whitespace-nowrap">
        <PersonIcon />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    );
  }

  const name = user.first_name || user.display_name || "Mi cuenta";

  const onLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-outline btn-sm max-w-[10rem]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <PersonIcon />
        <span className="hidden truncate sm:inline">{name}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl"
        >
          <div className="px-3 py-2 text-xs text-zinc-500">
            Hola, <span className="font-semibold text-zinc-700">{name}</span>
          </div>
          <Link
            role="menuitem"
            href="/cuenta"
            className="block rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Mi cuenta
          </Link>
          <Link
            role="menuitem"
            href="/cuenta/pedidos"
            className="block rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Mis pedidos
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
