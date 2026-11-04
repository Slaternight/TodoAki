"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-100 text-3xl">
        ⚠️
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold">No pudimos cargar la tienda</h1>
      <p className="mt-2 text-sm text-zinc-500">Intenta de nuevo en unos segundos.</p>
      <button onClick={() => retry()} className="btn btn-primary btn-md mt-6">
        Reintentar
      </button>
    </div>
  );
}
