import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components est désactivé pour la compatibilité avec
  // @opennextjs/cloudflare. Voir docs/DEPLOIEMENT.md.
  experimental: {
    serverActions: {
      // Les photos de profil sont limitées à 2 Mo ; on laisse de la marge
      // pour l'enveloppe multipart/form-data.
      bodySizeLimit: "3mb",
    },
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

initOpenNextCloudflareForDev();
