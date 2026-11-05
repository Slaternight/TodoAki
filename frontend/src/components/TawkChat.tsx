"use client";

import { useEffect } from "react";

// Chat en vivo de tawk.to. Se activa solo si NEXT_PUBLIC_TAWK_SRC está definido:
// el "src" del widget, con la forma https://embed.tawk.to/PROPERTY_ID/WIDGET_ID
// (lo copias de tawk.to > Administración > Canales de chat > Widget).
export function TawkChat() {
  const src = process.env.NEXT_PUBLIC_TAWK_SRC;

  useEffect(() => {
    if (!src || document.getElementById("tawk-to-embed")) return;
    const script = document.createElement("script");
    script.id = "tawk-to-embed";
    script.async = true;
    script.src = src;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, [src]);

  return null;
}
