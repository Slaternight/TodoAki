"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, no tiene sentido quedarse en el login.
  useEffect(() => {
    if (!loading && user) router.replace("/cuenta");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await login({ email, password });
    if (res.ok) {
      router.push("/cuenta");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo iniciar sesión.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-zinc-500">Entra para ver tus pedidos y comprar más rápido.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
