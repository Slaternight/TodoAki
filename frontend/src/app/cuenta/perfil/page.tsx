import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getSessionUser } from "@/lib/auth";
import { getStates } from "@/lib/woo";

export const metadata: Metadata = { title: "Editar perfil" };

// Página por-usuario: depende de la sesión (cookie), no se prerenderiza.
export const instant = false;

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");

  const states = await getStates("CO");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/cuenta" className="chip w-fit">
        ← Mi cuenta
      </Link>
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Editar perfil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tus datos y tu dirección. La dirección se autollenará en el checkout la próxima vez que compres.
        </p>
      </div>
      <ProfileForm initialUser={user} states={states} />
    </div>
  );
}
