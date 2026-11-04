import "server-only";

export type WompiStatus = "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";

export type WompiTransaction = {
  id: string;
  status: WompiStatus;
  reference: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string;
};

const WOMPI_API =
  process.env.WOMPI_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

// Consulta pública (no requiere llaves). Solo sirve para mostrar el resultado al
// cliente; quien marca el pedido como pagado es el webhook en WordPress.
export async function getWompiTransaction(id: string) {
  const res = await fetch(`${WOMPI_API}/transactions/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data: WompiTransaction };
  return json.data;
}

// La referencia que genera el plugin es "<id del pedido>-<timestamp>".
export function orderIdFromReference(reference: string) {
  return reference.split("-")[0];
}
