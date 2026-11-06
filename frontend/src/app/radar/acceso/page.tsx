import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RadarGate } from "@/components/RadarGate";
import { isRadarUnlocked } from "@/lib/radar";

export const metadata: Metadata = { title: "Acceso al radar" };

export const instant = false;

export default async function RadarAccesoPage() {
  // Si no hay contraseña configurada, isRadarUnlocked() ya devuelve true.
  if (await isRadarUnlocked()) redirect("/radar");
  return <RadarGate />;
}
