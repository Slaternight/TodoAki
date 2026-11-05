import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <RegisterForm />;
}
