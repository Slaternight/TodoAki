import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl">
        🔍
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-zinc-500">Puede que el producto ya no esté disponible.</p>
      <Link href="/" className="btn btn-primary btn-md mt-6">
        Volver a la tienda
      </Link>
    </div>
  );
}
