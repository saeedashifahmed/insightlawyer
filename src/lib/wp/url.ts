/**
 * URL helpers. WordPress sends URLs that point at the CMS host
 * (cms.insightlawyer.in). These need rewriting to the public host.
 */

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").replace(/\/$/, "");
const CMS_HOST_DEFAULT = "cms.insightlawyer.in";

function getCmsHost(): string {
  const ep = import.meta.env.WP_GRAPHQL_ENDPOINT ?? "";
  try {
    return new URL(ep).host || CMS_HOST_DEFAULT;
  } catch {
    return CMS_HOST_DEFAULT;
  }
}

export const CMS_HOST = getCmsHost();

export function siteUrl(path = "/"): string {
  if (!path) path = "/";
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

export function rewriteCmsUrl(input: string | null | undefined): string {
  if (!input) return "";
  try {
    const u = new URL(input, SITE_URL);
    if (u.host === CMS_HOST) {
      u.host = new URL(SITE_URL).host;
      u.protocol = new URL(SITE_URL).protocol;
    }
    return u.toString();
  } catch {
    return input;
  }
}

/**
 * Convert a WP `uri` (like "/category/criminal/") into a site-relative path
 * that this Astro app actually serves.
 */
export function toAppPath(uri: string | null | undefined): string {
  if (!uri) return "/";
  let p = uri;
  if (p.startsWith("http")) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* noop */
    }
  }
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

export function postPath(slug: string): string {
  return `/${slug}`;
}

export function pagePath(slug: string): string {
  return `/${slug}`;
}

export function newsPath(slug: string): string {
  return `/news/${slug}`;
}

export function categoryPath(slug: string, page?: number): string {
  return page && page > 1 ? `/category/${slug}/page/${page}` : `/category/${slug}`;
}

export function tagPath(slug: string, page?: number): string {
  return page && page > 1 ? `/tag/${slug}/page/${page}` : `/tag/${slug}`;
}

export function authorPath(slug: string): string {
  return `/author/${slug}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Strip trailing/leading slashes for safe path keys */
export function cleanPath(input: string): string {
  return input.replace(/^\/+|\/+$/g, "");
}
