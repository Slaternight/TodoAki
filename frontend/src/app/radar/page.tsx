import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RadarBoard } from "@/components/RadarBoard";
import {
  isRadarUnlocked,
  mergeEntries,
  radarConfigured,
  readDecisions,
  readRadar,
} from "@/lib/radar";

export const metadata: Metadata = { title: "Radar de tendencias" };

// Panel del dueño: depende de la cookie de sesión y lee archivos en disco,
// así que no se prerenderiza.
export const instant = false;

export default async function RadarPage() {
  if (!(await isRadarUnlocked())) redirect("/radar/acceso");

  const [radar, decisions] = await Promise.all([readRadar(), readDecisions()]);
  const entries = mergeEntries(radar, decisions);

  return (
    <RadarBoard
      generatedAt={radar.generatedAt}
      geo={radar.geo}
      entries={entries}
      secured={radarConfigured()}
    />
  );
}
