"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RadarStatus = "pending" | "approved" | "dismissed";

type Entry = {
  term: string;
  niche: string;
  score: number;
  aliexpress: string;
  status: RadarStatus;
  decidedAt: string | null;
};

type Props = {
  generatedAt: string | null;
  geo: string;
  entries: Entry[];
  secured: boolean;
};

type Tab = "pending" | "approved" | "dismissed" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pendientes" },
  { id: "approved", label: "Aprobadas" },
  { id: "dismissed", label: "Descartadas" },
  { id: "all", label: "Todas" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// La fecha viene en hora local del equipo que corrió el agente (ISO sin zona).
// La formateamos por partes para que servidor y cliente pinten lo mismo.
function formatGeneratedAt(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d, h, min] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}, ${h}:${min}`;
}

function geoLabel(geo: string): string {
  return geo === "CO" ? "Colombia" : geo;
}

export function RadarBoard({ generatedAt, geo, entries, secured }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Entry[]>(entries);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: items.filter((it) => it.status === "pending").length,
      approved: items.filter((it) => it.status === "approved").length,
      dismissed: items.filter((it) => it.status === "dismissed").length,
      all: items.length,
    }),
    [items],
  );

  const visible = useMemo(
    () => (tab === "all" ? items : items.filter((it) => it.status === tab)),
    [items, tab],
  );

  const updatedAt = formatGeneratedAt(generatedAt);

  async function decide(term: string, decision: RadarStatus) {
    const prev = items.find((it) => it.term === term)?.status ?? "pending";
    setError(null);
    setBusy((b) => ({ ...b, [term]: true }));
    setItems((list) =>
      list.map((it) =>
        it.term === term
          ? { ...it, status: decision, decidedAt: decision === "pending" ? null : new Date().toISOString() }
          : it,
      ),
    );
    try {
      const res = await fetch("/api/radar/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, decision }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "No se pudo guardar.");
      }
    } catch (e) {
      setItems((list) => list.map((it) => (it.term === term ? { ...it, status: prev } : it)));
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy((b) => ({ ...b, [term]: false }));
    }
  }

  async function salir() {
    try {
      await fetch("/api/radar/logout", { method: "POST" });
    } catch {
      /* da igual */
    }
    router.replace("/radar/acceso");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Radar de tendencias
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {items.length > 0 ? (
              <>
                {items.length} {items.length === 1 ? "tendencia" : "tendencias"} · {geoLabel(geo)}
                {updatedAt ? <> · actualizado {updatedAt}</> : null}
              </>
            ) : (
              <>Sin datos todavía · {geoLabel(geo)}</>
            )}
          </p>
        </div>
        {secured && (
          <button type="button" onClick={salir} className="btn btn-outline btn-sm">
            Salir
          </button>
        )}
      </div>

      {!secured && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Panel sin contraseña. Define <code className="font-mono">RADAR_PASSWORD</code> antes de
          publicarlo (ver la guía de despliegue).
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={
                active
                  ? "chip border-brand-600 bg-brand-600 text-white hover:border-brand-600 hover:text-white"
                  : "chip"
              }
            >
              {t.label}
              <span
                className={
                  active
                    ? "rounded-full bg-white/25 px-1.5 text-xs"
                    : "rounded-full bg-zinc-100 px-1.5 text-xs text-zinc-500"
                }
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold text-zinc-800">Aún no hay tendencias</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Corre el agente para generar la lista. Desde la carpeta del proyecto:
          </p>
          <pre className="mx-auto mt-3 w-fit rounded-lg bg-zinc-900 px-4 py-2 text-left text-xs text-zinc-100">
            python agent/trends.py
          </pre>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-zinc-500">
          No hay tendencias en esta pestaña.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((it) => (
            <RadarCard
              key={it.term}
              entry={it}
              busy={Boolean(busy[it.term])}
              onDecide={decide}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-400">
        <strong className="font-semibold text-zinc-500">Aprobar</strong> guarda la tendencia en tu
        lista para subirla a la tienda. La importación automática a WooCommerce llega en la Fase 2.
      </p>
    </div>
  );
}

function RadarCard({
  entry,
  busy,
  onDecide,
}: {
  entry: Entry;
  busy: boolean;
  onDecide: (term: string, decision: RadarStatus) => void;
}) {
  const breakout = entry.score >= 10000;
  const dimmed = entry.status === "dismissed";

  return (
    <li className={`card flex flex-col gap-3 p-4 ${dimmed ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="chip pointer-events-none px-2.5 py-1 text-xs">{entry.niche}</span>
        <span
          className={
            breakout
              ? "rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700"
              : "rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"
          }
          title={breakout ? "Crecimiento explosivo" : "Crecimiento de búsquedas"}
        >
          {breakout ? "🔥 Breakout" : `+${entry.score}%`}
        </span>
      </div>

      <p className="font-display text-base font-bold leading-snug text-zinc-900">{entry.term}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {entry.status === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => onDecide(entry.term, "approved")}
              disabled={busy}
              className="btn btn-accent btn-sm"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => onDecide(entry.term, "dismissed")}
              disabled={busy}
              className="btn btn-outline btn-sm"
            >
              Descartar
            </button>
          </>
        ) : (
          <>
            <span
              className={
                entry.status === "approved"
                  ? "inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700"
                  : "inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-600"
              }
            >
              {entry.status === "approved" ? "✓ Aprobada" : "Descartada"}
            </span>
            <button
              type="button"
              onClick={() => onDecide(entry.term, "pending")}
              disabled={busy}
              className="btn btn-outline btn-sm"
            >
              Deshacer
            </button>
          </>
        )}

        <a
          href={entry.aliexpress}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm font-medium text-brand-600 hover:underline"
        >
          Ver en AliExpress ↗
        </a>
      </div>
    </li>
  );
}
