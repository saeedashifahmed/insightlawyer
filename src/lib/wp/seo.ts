/**
 * RankMath head fetcher. Returns a sanitized HTML string ready to inject
 * directly into <head>.
 *
 * Strategy:
 *  1. Call /wp-json/rankmath/v1/getHead?url=<absoluteUrl>
 *  2. Strip noisy WP scripts (wp-includes/*).
 *  3. Keep all <meta>, <link rel="canonical">, OG/Twitter, JSON-LD.
 *  4. Rewrite any cms.insightlawyer.in absolute URLs inside the head to the
 *     public site URL so canonical/OG references stay clean.
 */

import { wpRest } from "./client";
import { CMS_HOST } from "./url";

const HEAD_ENDPOINT =
  import.meta.env.WP_RANKMATH_HEAD_ENDPOINT ??
  "https://cms.insightlawyer.in/wp-json/rankmath/v1/getHead";

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").replace(/\/$/, "");
const PUBLIC_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "insightlawyer.in";
  }
})();

interface RankMathResponse {
  success?: boolean;
  head?: string;
  data?: { head?: string };
}

/**
 * Fetch the full <head> HTML for a given absolute URL.
 * Returns the cleaned HTML string, or null on failure (caller falls back).
 */
export async function getRankMathHead(absoluteUrl: string): Promise<string | null> {
  const url = `${HEAD_ENDPOINT}?url=${encodeURIComponent(absoluteUrl)}`;
  try {
    const resp = await wpRest<RankMathResponse | string>(
      url,
      {},
      { name: `RankMath:${absoluteUrl}`, revalidate: 300 },
    );
    let head: string | undefined;
    if (typeof resp === "string") {
      head = resp;
    } else if (resp && typeof resp === "object") {
      head = resp.head ?? resp.data?.head;
    }
    if (!head || typeof head !== "string") return null;
    return cleanHead(head);
  } catch (err) {
    console.warn(`[seo] RankMath head fetch failed for ${absoluteUrl}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Strip wp-includes scripts and rewrite CMS URLs.
 * Conservative regex-based approach — we keep all meta/link/script[json-ld].
 */
export function cleanHead(html: string): string {
  let out = html;

  // 1. Drop <script src="...wp-includes/..."> blocks
  out = out.replace(
    /<script[^>]*src=["'][^"']*\/wp-includes\/[^"']*["'][^>]*>\s*<\/script>/gi,
    "",
  );
  // 2. Drop empty <script> wp embed blocks
  out = out.replace(
    /<script[^>]*>\s*window\._wpemojiSettings[\s\S]*?<\/script>/gi,
    "",
  );
  out = out.replace(
    /<script[^>]*>[\s\S]*?wp-embed\.min\.js[\s\S]*?<\/script>/gi,
    "",
  );
  // 3. Drop pingback link
  out = out.replace(/<link[^>]+rel=["']pingback["'][^>]*>/gi, "");
  // 4. Drop EditURI / wlwmanifest / shortlink — not useful on a headless front-end
  out = out.replace(/<link[^>]+rel=["']EditURI["'][^>]*>/gi, "");
  out = out.replace(/<link[^>]+rel=["']wlwmanifest["'][^>]*>/gi, "");
  out = out.replace(/<link[^>]+rel=["']shortlink["'][^>]*>/gi, "");
  // 5. Rewrite any cms host references in attribute values to the public host
  const cmsRe = new RegExp(`https?://${escapeRe(CMS_HOST)}`, "gi");
  out = out.replace(cmsRe, `https://${PUBLIC_HOST}`);
  // 6. Collapse whitespace runs
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
