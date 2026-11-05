import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md">
          <div className="card h-48 animate-pulse" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
