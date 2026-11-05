import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function IngresarPage() {
  return <LoginForm />;
}
