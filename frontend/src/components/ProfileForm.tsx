"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "@/lib/types";
import { useAuth } from "./AuthProvider";

export function ProfileForm({
  initialUser,
  states,
}: {
  initialUser: AuthUser;
  states: Record<string, string>;
}) {
  const { updateProfile } = useAuth();
  const router = useRouter();
  const b = initialUser.billing;

  const [form, setForm] = useState({
    first_name: initialUser.first_name ?? "",
    last_name: initialUser.last_name ?? "",
    phone: b?.phone ?? "",
    address_1: b?.address_1 ?? "",
    address_2: b?.address_2 ?? "",
    city: b?.city ?? "",
    state: b?.state ?? "",
    postcode: b?.postcode ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setOk(false);
      setForm((f) => ({ ...f, [name]: e.target.value }));
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    setSaving(true);
    const res = await updateProfile({
      first_name: form.first_name,
      last_name: form.last_name,
      billing: {
        phone: form.phone,
        address_1: form.address_1,
        address_2: form.address_2,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
      },
    });
    setSaving(false);
    if (res.ok) {
      setOk(true);
      router.refresh();
    } else {
      setError(res.error ?? "No se pudo guardar.");
    }
  };

  const stateOptions = Object.entries(states);

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {ok && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">Cambios guardados ✓</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Nombre</span>
          <input className="input" autoComplete="given-name" {...field("first_name")} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Apellido</span>
          <input className="input" autoComplete="family-name" {...field("last_name")} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Celular</span>
        <input type="tel" className="input" autoComplete="tel" {...field("phone")} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Dirección</span>
        <input className="input" autoComplete="address-line1" placeholder="Calle 00 # 00-00" {...field("address_1")} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Apartamento, torre, barrio (opcional)</span>
        <input className="input" autoComplete="address-line2" {...field("address_2")} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Ciudad</span>
          <input className="input" autoComplete="address-level2" {...field("city")} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Departamento</span>
          {stateOptions.length > 0 ? (
            <select className="input" {...field("state")}>
              <option value="">Selecciona…</option>
              {stateOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input className="input" {...field("state")} />
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-zinc-700">Código postal (opcional)</span>
        <input className="input" autoComplete="postal-code" {...field("postcode")} />
      </label>

      <button type="submit" className="btn btn-primary btn-md w-full" disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
