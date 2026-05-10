# Insight Lawyer — Frontend

A production-ready, headless WordPress frontend for an Indian legal editorial site. Built with Astro 6.3 (SSR), Tailwind v4, and TypeScript. Pulls content from `cms.insightlawyer.in` via WPGraphQL with REST fallback. SEO is delegated to RankMath (head injected raw at request time).

## Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | Astro 6.3, SSR (`output: server`)                       |
| Adapter          | `@astrojs/node` standalone (swap easily for Cloudflare/Vercel) |
| Styling          | Tailwind CSS 4.2 (CSS-first via `@tailwindcss/vite` and `@theme`) |
| Type system      | TypeScript strict, `noUncheckedIndexedAccess`           |
| Data layer       | WPGraphQL (primary) + WP REST (fallback / sitemap / RankMath head) |
| HTML enhancement | `sanitize-html` + `node-html-parser` + `shiki`          |
| Icons            | `lucide-astro`                                          |
| Fonts            | Self-hosted variable fonts via `@fontsource-variable/*` |
| View transitions | Astro `<ClientRouter />`                                |

No client-side React/Vue/Svelte. Tiny vanilla JS islands only (header, drawer, toc, share, theme).

## Getting started

```bash
pnpm install
cp .env.example .env       # edit values for your environment
pnpm dev                   # http://localhost:4321
```

To run **without** a live WordPress (using bundled mock fixtures):

```bash
WP_USE_MOCK=1 pnpm dev
```

To build and serve production SSR:

```bash
pnpm build
pnpm start                 # listens on $HOST:$PORT (defaults from astro.config.ts)
```

## Environment variables

| Var                          | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `PUBLIC_SITE_URL`            | Public origin, e.g. `https://insightlawyer.in`                   |
| `PUBLIC_SITE_NAME`           | Site title used in fallback SEO                                  |
| `PUBLIC_SITE_TAGLINE`        | Default description                                              |
| `WP_GRAPHQL_ENDPOINT`        | `https://cms.insightlawyer.in/graphql`                           |
| `WP_REST_BASE`               | `https://cms.insightlawyer.in/wp-json`                           |
| `WP_RANKMATH_HEAD_ENDPOINT`  | RankMath REST endpoint for the per-URL `<head>` block            |
| `REVALIDATE_SECRET`          | Secret required by `/api/revalidate`                             |
| `DEFAULT_OG_IMAGE`           | Default OG image path                                            |
| `DEFAULT_LOCALE`             | `en-IN`                                                          |
| `DEFAULT_TIMEZONE`           | `Asia/Kolkata`                                                   |
| `WP_USE_MOCK`                | `1` to load `/mock/*.json` instead of hitting WP                 |

## Repository layout

```
src/
  assets/                 SVG logos and OG fallback
  components/
    cards/                Post cards (hero, large, medium, small, list)
    layout/               Header, footer, nav, drawer, breadcrumbs
    post/                 Article header/body/share/TOC/author
    seo/                  RankMath head injector + JSON-LD
    ui/                   Primitives (Button, Pill, Pagination, …)
  layouts/                Base, Article, Archive, Page
  lib/
    wp/                   GraphQL client, queries, REST, sanitize, enhance-html, types
    utils/                date, reading-time, share, classnames
  middleware.ts           CSP, security headers, trailing-slash canonical
  pages/                  All routes (see below)
  styles/                 global.css, prose.css, print.css
mock/                     Fixture JSON loaded when WP_USE_MOCK=1
public/                   Static assets (favicon, manifest, robots fallback)
```

## Routes

| Path                                | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| `/`                                 | Magazine homepage                              |
| `/blog`, `/blog/page/[n]`           | Article archive                                |
| `/news`, `/news/[slug]`             | News CPT (or `news` category) listing + single |
| `/[...slug]`                        | Catch-all: resolves post → page → news         |
| `/category/[slug]`, `…/page/[n]`    | Category archive                               |
| `/tag/[slug]`, `…/page/[n]`         | Tag archive                                    |
| `/author/[slug]`                    | Author archive                                 |
| `/search?q=…`                       | Client-fetched search results                  |
| `/saved`                            | LocalStorage-backed reader bookmarks           |
| `/about`, `/contact`, `/privacy`, `/disclaimer` | WP-page driven, with hard-coded fallback     |
| `/sitemap.xml`                      | Proxies the WP/RankMath sitemap                |
| `/robots.txt`                       | Dynamic, references the proxied sitemap        |
| `/rss.xml`                          | Latest 30 posts, with `<content:encoded>`      |
| `/api/search?q=…`                   | JSON search endpoint                           |
| `/api/revalidate`                   | POST webhook for cache invalidation            |
| `/api/subscribe`                    | Newsletter placeholder                         |
| `/_design`                          | Dev-only sandbox of every component            |

## SEO via RankMath

`BaseLayout.astro` calls `getRankMathHead(url)` (`src/lib/wp/seo.ts`). That hits `/wp-json/rankmath/v1/getHead?url=<absolute>`, strips `wp-includes/*` script noise and pingback-style links, rewrites any `cms.insightlawyer.in` URLs to `insightlawyer.in`, and pastes the cleaned `<head>` block raw via `<Fragment set:html />`.

If the fetch fails or RankMath is unreachable, `FallbackSeo.astro` renders a minimal but valid set of meta tags from props.

Two extra JSON-LD blocks are emitted on top of RankMath's: `BreadcrumbList` (every article) and `WebSite + SearchAction` / `Organization` (homepage).

## Article HTML pipeline

`src/lib/wp/enhance-html.ts` runs WordPress HTML through this pipeline before rendering:

1. **Sanitize** with a strict allow-list (`sanitize-html`). Only YouTube, Vimeo, Twitter, Scribd, etc., iframes survive.
2. **Slugify** every `h2`/`h3`, append a hover-only anchor link, and feed the IDs into the right-rail TOC and mobile TOC accordion.
3. **Wrap tables** in `.table-wrap` for horizontal scroll on mobile.
4. **Make images responsive**: `loading=lazy`, `decoding=async`, derive `srcset` from WP size suffixes, wrap orphan `<img>` in `<figure>`.
5. **Promote `pullquote` blockquotes** to the styled pull-quote block.
6. **External links** get `rel="noopener noreferrer" target="_blank" data-external="true"` (CSS appends an external-link icon).
7. **Internal CMS links** are rewritten to the public host.
8. **Citations**: conservative regex pass tags `AIR 1973 SC 1461`, `(2020) 5 SCC 123`, `Section 302`, `Article 14`, etc., as `<span class="citation">` for distinct typography.
9. **Empty `<p>`** removed.
10. **Code blocks** highlighted with Shiki dual theme (`github-light` / `github-dark`) at request time.

Output goes through `<PostBody>`, which adds a vanilla-JS image lightbox.

## Mobile-app feel

- Sticky header with auto-hide on scroll-down, slide-in on scroll-up (compact mode after 80 px).
- Bottom tab bar (Home / News / Sections / Search / Saved) with `env(safe-area-inset-bottom)`, gold active rule, hides on scroll-down.
- Drawer menu sliding from the left, body-scroll-locked while open, with theme toggle.
- View transitions on hero image, title, and category badge between archive and single (`transition:name`).
- Floating share FAB on article pages → bottom sheet with WhatsApp / Twitter / LinkedIn / etc. + Web Share API.
- Reading progress under the header, sticky right-rail TOC with scrollspy on desktop, accordion TOC on mobile.
- Image lightbox on tap.
- Skeleton screens, toast helper (`window.dispatchEvent(new CustomEvent('il-toast', { detail: 'Saved' }))`).
- 44 × 44 minimum touch targets. `prefers-reduced-motion` honoured throughout.
- `manifest.webmanifest`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-capable`. Service worker intentionally **not** registered in v1; the `BaseLayout` notes where Workbox would slot in.

## Cache and revalidation

`src/lib/wp/cache.ts` keeps an in-process LRU. TTLs default to 60 s for lists and 300 s for singles, with a hard cap on entries.

To revalidate a path from WordPress on save, install the WP **Webhooks** plugin (or RankMath's Cache Invalidate add-on, or a simple `save_post` hook) and configure a POST to:

```
https://insightlawyer.in/api/revalidate?secret=$REVALIDATE_SECRET
Content-Type: application/json
{
  "paths": ["/<slug>"],
  "tags":  ["GetHome"]
}
```

Or, to drop the entire cache:

```json
{ "all": true }
```

## Deployment

### Node VPS (default)

```bash
pnpm build
NODE_ENV=production HOST=0.0.0.0 PORT=4321 node ./dist/server/entry.mjs
```

Run it under `systemd` or `pm2` and put nginx in front. Recommended nginx snippet:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_pass http://127.0.0.1:4321;
```

Cache static assets at the edge:

```nginx
location ~* ^/_astro/ {
  proxy_pass http://127.0.0.1:4321;
  proxy_cache static_cache;
  proxy_cache_valid 200 30d;
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### Cloudflare or Vercel

Swap the adapter in `astro.config.ts`:

```ts
import cloudflare from "@astrojs/cloudflare";
// or: import vercel from "@astrojs/vercel/serverless";
adapter: cloudflare({ mode: "directory" }),
```

The data layer is fetch-only (no Node-specific APIs), so no other changes are needed. `sharp` is excluded from the SSR bundle on Cloudflare; the platform's image service or Astro's `<Image />` over a Cloudflare Image Resizing endpoint should be substituted.

## WordPress backend checklist

These plugins must be active on `cms.insightlawyer.in`:

- **WPGraphQL**
- **WPGraphQL for ACF** (if ACF is in use — optional)
- **WPGraphQL Yoast SEO** *or* a RankMath GraphQL connector (the field `seo.fullHead` should expose the block. If unavailable, the REST `/wp-json/rankmath/v1/getHead` endpoint is used automatically.)
- **RankMath SEO** (or Yoast — RankMath is wired up by default)
- **Custom Post Type UI** if you use a separate `news` CPT (the queries can also treat the `news` category as the news source — both paths are supported)
- **Classic Editor + Gutenberg** (both — Gutenberg block classes are styled in `prose.css`)

Recommended WP options:

- Permalinks → "Post name"
- Settings → General → URL set to `https://cms.insightlawyer.in`
- Settings → Reading → Front page = "Latest posts" (the Astro homepage handles the layout)

CORS isn't required for server-to-server calls (Astro runs SSR), but if the browser ever calls WP directly (it shouldn't), enable WPGraphQL CORS in the plugin settings.

## Performance budgets

- **LCP** < 2.0 s on a 4G mid-tier Android (article and home).
- **CLS** < 0.05.
- **INP** < 150 ms.
- **JS shipped** < 30 KB gzipped on article pages.

Lighthouse mobile targets: Performance 95+, Accessibility 100, Best Practices 100, SEO 100.

## Troubleshooting

| Symptom                                              | Likely cause / fix                                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Article pages render but show fallback `<title>`     | RankMath head fetch failed. Verify `/wp-json/rankmath/v1/getHead?url=…` returns JSON with a `head` field. Check WP firewall / Cloudflare WAF rules. |
| Images don't load (`403`)                            | The image domain isn't in `astro.config.ts → image.domains`. Add the host and rebuild.                                                              |
| GraphQL 400 with no error                            | A WPGraphQL field referenced in `queries.ts` doesn't exist on this WP install (commonly RankMath schema fields). Remove the missing field.          |
| Webhook `/api/revalidate` returns 401                | `secret` query param doesn't match `REVALIDATE_SECRET`.                                                                                             |
| `<head>` contains both Astro and RankMath `<title>`  | The fallback rendered alongside RankMath. Inspect dev console for the warn log; the cause is usually a transient fetch timeout.                     |
| Search returns nothing                               | WPGraphQL's `search` operator requires the **MU plugin** WPGraphQL Search to be enabled in some configs.                                            |
| Layout shifts on first paint                         | Ensure the host serves `Content-Encoding: br` or `gzip` and HTTP/2; ensure `prefer-reduced-motion` is honoured by your stress test.                 |

## Scripts

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `pnpm dev`      | Start dev server with HMR                     |
| `pnpm build`    | Build the SSR bundle to `./dist`              |
| `pnpm start`    | Run the SSR bundle (Node)                     |
| `pnpm preview`  | Preview the built site locally                |
| `pnpm check`    | `astro check` + `tsc --noEmit`                |
| `pnpm format`   | Prettier across `src/`                        |
| `pnpm lint`     | Prettier check (no auto-fix)                  |

## License

Private. © Insight Lawyer.
