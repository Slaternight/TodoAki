import type { NextConfig } from "next";

// Las imágenes de los productos se sirven desde WordPress (/wp-content/uploads).
const wordpress = process.env.WC_STORE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: wordpress ? [new URL(`${wordpress}/wp-content/uploads/**`)] : [],
    // Permite un WordPress local (LocalWP, XAMPP...) mientras desarrollas.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
