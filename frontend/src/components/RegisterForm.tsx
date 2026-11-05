"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function RegisterForm() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/cuenta");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await register({ email, password, first_name: first, last_name: last });
    if (res.ok) {
      router.push("/cuenta");
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo crear la cuenta.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Crear cuenta</h1>
      <p className="mt-1 text-sm text-zinc-500">Regístrate para seguir tus pedidos y pagar más rápido.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first" className="mb-1 block text-sm font-medium text-zinc-700">
              Nombre
            </label>
            <input
              id="first"
              className="input"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="last" className="mb-1 block text-sm font-medium text-zinc-700">
              Apellido
            </label>
            <input
              id="last"
              className="input"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
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
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
          {submitting ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-brand-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
