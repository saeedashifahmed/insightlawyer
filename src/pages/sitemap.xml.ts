import type { APIRoute } from "astro";
import { getSitemapXml } from "@lib/wp/rest";
import { CMS_HOST } from "@lib/wp/url";

export const prerender = false;

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").replace(/\/$/, "");

/** Proxy WP/RankMath sitemap; rewrite CMS host to public host. */
export const GET: APIRoute = async () => {
  try {
    const xml = await getSitemapXml();
    const rewritten = xml.replaceAll(`https://${CMS_HOST}`, SITE_URL).replaceAll(`http://${CMS_HOST}`, SITE_URL);
    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=1800",
      },
    });
  } catch {
    // Minimal fallback if WP is unreachable
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/blog</loc></url>
  <url><loc>${SITE_URL}/news</loc></url>
</urlset>`;
    return new Response(fallback, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
};
