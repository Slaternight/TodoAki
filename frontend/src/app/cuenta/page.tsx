import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mi cuenta" };

// Página por-usuario: depende de la sesión (cookie), no se prerenderiza.
export const instant = false;

export default async function CuentaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const greeting = user.first_name || user.display_name || "cliente";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Mi cuenta</h1>
          <p className="mt-1 text-sm text-zinc-500">Hola, {greeting} 👋</p>
        </div>
        <LogoutButton />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-bold">Tus datos</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Nombre</dt>
            <dd className="text-sm font-medium text-zinc-800">{fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Correo</dt>
            <dd className="text-sm font-medium text-zinc-800">{user.email}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/cuenta/pedidos"
          className="card flex items-center justify-between p-5 transition hover:shadow-md"
        >
          <span>
            <span className="block font-semibold text-zinc-800">Mis pedidos</span>
            <span className="block text-sm text-zinc-500">Revisa el estado de tus compras</span>
          </span>
          <span aria-hidden className="text-xl text-brand-600">→</span>
        </Link>
        <Link
          href="/cuenta/perfil"
          className="card flex items-center justify-between p-5 transition hover:shadow-md"
        >
          <span>
            <span className="block font-semibold text-zinc-800">Editar perfil</span>
            <span className="block text-sm text-zinc-500">Tus datos y dirección guardada</span>
          </span>
          <span aria-hidden className="text-xl text-brand-600">
            →
          </span>
        </Link>
        <Link
          href="/"
          className="card flex items-center justify-between p-5 transition hover:shadow-md"
        >
          <span>
            <span className="block font-semibold text-zinc-800">Seguir comprando</span>
            <span className="block text-sm text-zinc-500">Vuelve al catálogo</span>
          </span>
          <span aria-hidden className="text-xl text-brand-600">→</span>
        </Link>
      </div>
    </div>
  );
}
