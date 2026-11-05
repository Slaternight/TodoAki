import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return <ForgotPasswordForm />;
}
