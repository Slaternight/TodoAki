import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RefreshWhilePending, ResetCartOnMount } from "@/components/PaymentEffects";
import { formatPrice } from "@/lib/format";
import { getWompiTransaction, orderIdFromReference } from "@/lib/wompi";

export const metadata: Metadata = { title: "Resultado del pago" };

type Tone = "success" | "pending" | "error";
const TONE: Record<Tone, { icon: string; ring: string }> = {
  success: { icon: "✓", ring: "bg-emerald-100 text-emerald-700" },
  pending: { icon: "⏳", ring: "bg-amber-100 text-amber-700" },
  error: { icon: "✕", ring: "bg-red-100 text-red-700" },
};

// Wompi redirige aquí con ?id=<id de la transacción>.
async function PaymentResult({ searchParams }: Pick<PageProps<"/checkout/resultado">, "searchParams">) {
  const { id } = await searchParams;
  const transaction = typeof id === "string" ? await getWompiTransaction(id) : null;

  if (!transaction) {
    return (
      <Result tone="pending" title="No encontramos tu pago">
        Si ya pagaste, revisa tu correo: te enviaremos la confirmación del pedido.
      </Result>
    );
  }

  const order = orderIdFromReference(transaction.reference);
  const amount = formatPrice(String(transaction.amount_in_cents), {
    currency_code: transaction.currency,
    currency_minor_unit: 2,
  });

  switch (transaction.status) {
    case "APPROVED":
      return (
        <Result tone="success" title="¡Pago aprobado!">
          <ResetCartOnMount />
          Tu pedido <strong>#{order}</strong> por {amount} fue confirmado. Te enviamos el detalle a
          tu correo.
        </Result>
      );
    case "PENDING":
      return (
        <Result tone="pending" title="Tu pago está en proceso">
          <RefreshWhilePending />
          Estamos esperando la confirmación de Wompi para el pedido <strong>#{order}</strong>. Esta
          página se actualiza sola.
        </Result>
      );
    default:
      return (
        <Result tone="error" title="El pago no fue aprobado">
          Tu pedido <strong>#{order}</strong> sigue pendiente de pago. Puedes intentarlo de nuevo con
          otro medio de pago.
          <Link href="/checkout" className="mt-6 block font-medium text-brand-700 underline">
            Reintentar el pago
          </Link>
        </Result>
      );
  }
}

function Result({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div className="card mx-auto max-w-lg px-6 py-14 text-center">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-bold ${t.ring}`}>
        {t.icon}
      </div>
      <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <div className="mt-3 text-zinc-600">{children}</div>
      <Link href="/" className="btn btn-outline btn-md mt-8">
        Seguir comprando
      </Link>
    </div>
  );
}

export default function PaymentResultPage(props: PageProps<"/checkout/resultado">) {
  return (
    <Suspense fallback={<p className="py-16 text-center text-zinc-500">Consultando tu pago…</p>}>
      <PaymentResult searchParams={props.searchParams} />
    </Suspense>
  );
}
