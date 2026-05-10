import { defineMiddleware } from "astro:middleware";

const CSP = [
  "default-src 'self'",
  "img-src 'self' https://cms.insightlawyer.in https://secure.gravatar.com https://*.gravatar.com data: blob:",
  "script-src 'self' 'unsafe-inline' https://platform.twitter.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://platform.twitter.com https://publish.twitter.com https://w.soundcloud.com https://open.spotify.com",
  "connect-src 'self' https://cms.insightlawyer.in",
  "media-src 'self' https://cms.insightlawyer.in",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Strip trailing slash on non-root paths for canonical safety
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`, 308);
  }

  const response = await next();

  // Security headers — set on every response
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // Cache hints for static asset paths
  if (
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/")
  ) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return response;
});
