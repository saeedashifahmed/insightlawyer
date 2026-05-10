import type { APIRoute } from "astro";

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").replace(/\/$/, "");

export const prerender = false;

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_design

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
