"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const login = params.get("login") ?? "";
  const key = params.get("key") ?? "";
  const invalidLink = !login || !key;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, key, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "No se pudo restablecer la contraseña.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("No hay conexión con la tienda. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-2xl">✅</div>
          <h1 className="mt-4 font-display text-xl font-extrabold">Contraseña actualizada</h1>
          <p className="mt-2 text-sm text-zinc-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <Link href="/ingresar" className="btn btn-primary btn-md mt-6">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Nueva contraseña</h1>
      {invalidLink ? (
        <div className="card mt-6 p-6 text-center text-sm text-zinc-500">
          Este enlace no es válido o está incompleto. Pide uno nuevo en{" "}
          <Link href="/recuperar" className="font-semibold text-brand-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
              Nueva contraseña
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
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-zinc-700">
              Repite la contraseña
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}
