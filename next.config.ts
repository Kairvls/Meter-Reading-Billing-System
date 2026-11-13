import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep native / CJS-heavy packages external so Vercel doesn't break on ESM (jose).
  serverExternalPackages: ["better-sqlite3", "firebase-admin", "@google-cloud/firestore"],
  cacheComponents: true,
  partialPrefetching: true,
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
