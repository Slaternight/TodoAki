"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/account/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Da igual: mostramos siempre el mismo mensaje.
    }
    setSubmitting(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl">📩</div>
          <h1 className="mt-4 font-display text-xl font-extrabold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Si hay una cuenta con <strong>{email}</strong>, te enviamos un enlace para crear una nueva
            contraseña. Revisa también la carpeta de spam.
          </p>
          <Link href="/ingresar" className="btn btn-primary btn-md mt-6">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
        ¿Olvidaste tu contraseña?
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Escribe tu correo y te enviamos un enlace para restablecerla.
      </p>
      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6">
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
        <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href="/ingresar" className="font-semibold text-brand-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
