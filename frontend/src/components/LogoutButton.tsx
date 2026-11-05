"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function LogoutButton({ className = "btn btn-outline btn-sm" }: { className?: string }) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await logout();
        router.push("/");
        router.refresh();
      }}
    >
      Cerrar sesión
    </button>
  );
}
