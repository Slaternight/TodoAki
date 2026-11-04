import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getStates } from "@/lib/woo";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  const states = await getStates("CO");
  return <CheckoutForm states={states} />;
}
