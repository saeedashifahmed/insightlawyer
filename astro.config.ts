import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in";
const CMS_HOST = "cms.insightlawyer.in";

export default defineConfig({
  site: SITE_URL,
  output: "server",
  adapter: node({ mode: "standalone" }),
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  image: {
    domains: [CMS_HOST, "secure.gravatar.com"],
    remotePatterns: [
      { protocol: "https", hostname: CMS_HOST },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "*.gravatar.com" },
    ],
  },
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@lucide/astro"],
    },
    optimizeDeps: {
      exclude: ["sharp"],
    },
  },
  redirects: {
    "/wp-admin": SITE_URL,
    "/wp-login.php": SITE_URL,
  },
  experimental: {
    contentIntellisense: true,
  },
});
