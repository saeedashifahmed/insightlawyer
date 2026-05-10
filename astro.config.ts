import { defineConfig, passthroughImageService } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in";
const CMS_HOST = "cms.insightlawyer.in";

export default defineConfig({
  site: SITE_URL,
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  // Cloudflare Workers can't run sharp — use passthrough so we serve WP URLs
  // directly. WordPress already returns optimized sizes via its srcset.
  image: {
    service: passthroughImageService(),
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
  },
  redirects: {
    "/wp-admin": SITE_URL,
    "/wp-login.php": SITE_URL,
  },
  experimental: {
    contentIntellisense: true,
  },
});
