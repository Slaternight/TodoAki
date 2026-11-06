"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RadarGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/radar/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/radar");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "No se pudo entrar.");
    } catch {
      setError("No hay conexión. Intenta de nuevo.");
    }
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        Radar de tendencias
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Panel privado del dueño. Ingresa la contraseña.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="radar-password" className="mb-1 block text-sm font-medium text-zinc-700">
            Contraseña
          </label>
          <input
            id="radar-password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del panel"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-400">
        Se define con la variable <code className="font-mono">RADAR_PASSWORD</code>.
      </p>
    </div>
  );
}
