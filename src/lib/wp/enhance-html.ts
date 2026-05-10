/**
 * Server-side enhancement of WordPress HTML.
 *
 * Order of operations:
 *   1. Sanitize via strict allow-list (sanitizeWpHtml).
 *   2. Slugify h2/h3 headings, append anchor link.
 *   3. Wrap tables for horizontal scroll.
 *   4. Make images responsive: lazy + decoding + srcset where derivable.
 *   5. Wrap orphan <img> in <figure>; promote shortcode captions to <figcaption>.
 *   6. Add `class="pullquote"` to blockquotes that already carry the WP class.
 *   7. External links: rel + target + data-external.
 *   8. Internal CMS links rewritten to public host.
 *   9. Strip empty <p>.
 *  10. Wrap legal citations (e.g., "AIR 1973 SC 1461", "Section 302") in
 *      <span class="citation"> at the string level (only outside tags).
 *  11. Shiki highlight <pre><code class="language-foo">.
 */

import { parse, type HTMLElement } from "node-html-parser";
import { sanitizeWpHtml } from "./sanitize";
import { rewriteCmsUrl, slugify, CMS_HOST } from "./url";
import { getHighlighter } from "./highlighter";

const CITATION_PATTERNS: RegExp[] = [
  /\(?\d{4}\)?\s+\d+\s+SCC\s+(?:OnLine\s+SC\s+)?\d+/g,
  /\bAIR\s+\d{4}\s+SC\s+\d+\b/g,
  /\bSection\s+\d+[A-Z]?(?:\(\d+\))?(?:\s+(?:of\s+)?(?:the\s+)?(?:IPC|CrPC|CPC|Constitution|IT\s+Act|HMA|NDPS\s+Act|Evidence\s+Act))?/g,
  /\bArticle\s+\d+[A-Z]?(?:\(\d+\))?(?:\s+of\s+the\s+Constitution)?/g,
  /\(\d{4}\)\s+\d+\s+SCR\s+\d+/g,
];

interface EnhanceOptions {
  /** Used to drop CMS host on internal links. */
  cmsHost?: string;
  /** When true, run Shiki highlighting on code blocks. Defaults to true. */
  highlight?: boolean;
  /** Expected sizes attr for images. */
  imageSizes?: string;
}

/**
 * Public entry — sanitize, then run all enhancers, return HTML string.
 */
export async function enhanceWpHtml(
  raw: string,
  opts: EnhanceOptions = {},
): Promise<string> {
  if (!raw) return "";

  const cmsHost = opts.cmsHost ?? CMS_HOST;
  const sizes = opts.imageSizes ?? "(min-width: 1024px) 720px, (min-width: 768px) 90vw, 100vw";

  const safe = sanitizeWpHtml(raw);
  const root = parse(safe, {
    blockTextElements: { script: false, noscript: false, style: false, pre: true },
  });

  walkHeadings(root);
  walkTables(root);
  walkImages(root, sizes);
  walkBlockquotes(root);
  walkLinks(root, cmsHost);
  removeEmptyParagraphs(root);

  let html = root.toString();
  html = wrapCitations(html);

  if (opts.highlight !== false) {
    html = await highlightCodeBlocks(html);
  }

  return html;
}

/* -----------------------------------------------------------------------------
 * Headings → ids + anchor link
 * -------------------------------------------------------------------------- */

function walkHeadings(root: HTMLElement): void {
  const usedIds = new Set<string>();
  for (const h of root.querySelectorAll("h2, h3")) {
    const text = h.text.trim();
    if (!text) continue;
    let id = h.getAttribute("id");
    if (!id) id = slugify(text);
    if (!id) continue;
    let candidate = id;
    let i = 2;
    while (usedIds.has(candidate)) candidate = `${id}-${i++}`;
    usedIds.add(candidate);
    h.setAttribute("id", candidate);

    if (!h.querySelector("a.anchor")) {
      const safeLabel = escapeAttr(text);
      h.insertAdjacentHTML(
        "beforeend",
        ` <a class="anchor" href="#${candidate}" aria-label="Link to section: ${safeLabel}">#</a>`,
      );
    }
  }
}

/**
 * Extract a flat TOC from rendered article HTML.
 */
export function extractToc(html: string): Array<{ id: string; text: string; level: 2 | 3 }> {
  if (!html) return [];
  const root = parse(html);
  const out: Array<{ id: string; text: string; level: 2 | 3 }> = [];
  for (const h of root.querySelectorAll("h2, h3")) {
    const id = h.getAttribute("id");
    const text = h.text.replace(/#$/, "").trim();
    if (!id || !text) continue;
    out.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
  }
  return out;
}

/* -----------------------------------------------------------------------------
 * Tables — wrap for horizontal scroll
 * -------------------------------------------------------------------------- */

function walkTables(root: HTMLElement): void {
  for (const table of root.querySelectorAll("table")) {
    const parent = table.parentNode as HTMLElement | null;
    if (!parent) continue;
    const parentClasses = parent.getAttribute("class") ?? "";
    if (parentClasses.includes("table-wrap")) continue;
    const wrap = parse(`<div class="table-wrap"></div>`).firstChild as HTMLElement;
    parent.exchangeChild(table, wrap);
    wrap.appendChild(table);
  }
}

/* -----------------------------------------------------------------------------
 * Images — lazy, async, srcset, figure wrapping
 * -------------------------------------------------------------------------- */

function walkImages(root: HTMLElement, sizes: string): void {
  for (const img of root.querySelectorAll("img")) {
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");

    const src = img.getAttribute("src") ?? "";
    if (!img.hasAttribute("srcset") && src) {
      const set = deriveSrcset(src);
      if (set) img.setAttribute("srcset", set);
    }
    if (!img.hasAttribute("sizes")) img.setAttribute("sizes", sizes);
    if (!img.hasAttribute("alt")) img.setAttribute("alt", "");

    const parent = img.parentNode as HTMLElement | null;
    if (!parent) continue;
    if (parent.tagName !== "FIGURE" && parent.tagName !== "PICTURE" && parent.tagName !== "A") {
      const align = pickAlignClass(img.getAttribute("class") ?? "");
      const fig = parse(`<figure class="${align}"></figure>`).firstChild as HTMLElement;
      parent.exchangeChild(img, fig);
      fig.appendChild(img);
    }
  }
}

function pickAlignClass(classes: string): string {
  const aligns = ["alignleft", "alignright", "aligncenter", "alignwide", "alignfull"];
  for (const a of aligns) if (classes.includes(a)) return a;
  return "";
}

function deriveSrcset(src: string): string | null {
  const m = src.match(/^(.*)-(\d+)x(\d+)(\.[a-z]+)$/i);
  if (!m) return null;
  const base = m[1] ?? "";
  const ext = m[4] ?? "";
  if (!base || !ext) return null;
  const widths = [480, 768, 1024, 1536, 2048];
  return widths
    .map((w) => `${base}-${w}x${Math.round(w * 0.5625)}${ext} ${w}w`)
    .join(", ");
}

/* -----------------------------------------------------------------------------
 * Blockquotes — promote pullquote class
 * -------------------------------------------------------------------------- */

function walkBlockquotes(root: HTMLElement): void {
  for (const bq of root.querySelectorAll("blockquote")) {
    const cls = bq.getAttribute("class") ?? "";
    if (/pullquote|is-style-pullquote/i.test(cls) && !cls.includes("pullquote ")) {
      bq.setAttribute("class", `${cls} pullquote`.trim());
    }
  }
}

/* -----------------------------------------------------------------------------
 * Links — external markers, internal rewrite
 * -------------------------------------------------------------------------- */

function walkLinks(root: HTMLElement, cmsHost: string): void {
  const publicHost = (() => {
    try {
      return new URL(import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").host;
    } catch {
      return "insightlawyer.in";
    }
  })();

  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    let host: string | null = null;
    try {
      const u = new URL(href, `https://${publicHost}`);
      host = u.host;
      if (host === cmsHost) {
        a.setAttribute("href", rewriteCmsUrl(u.toString()));
        continue;
      }
    } catch {
      continue;
    }

    if (host && host !== publicHost) {
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("target", "_blank");
      a.setAttribute("data-external", "true");
    }
  }
}

/* -----------------------------------------------------------------------------
 * Empty paragraphs
 * -------------------------------------------------------------------------- */

function removeEmptyParagraphs(root: HTMLElement): void {
  for (const p of root.querySelectorAll("p")) {
    const txt = p.text.replace(/ /g, "").trim();
    if (!txt && p.querySelectorAll("img, iframe, video, audio").length === 0) {
      p.remove();
    }
  }
}

/* -----------------------------------------------------------------------------
 * Citation wrapping at the HTML-string level.
 *
 * We tokenize the HTML into "tag" and "text" segments, and only run the
 * citation patterns on text segments — never inside tag attributes or text
 * already wrapped in citation, code, anchor, or heading tags.
 * -------------------------------------------------------------------------- */

const CITATION_SKIP_TAGS = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "script", "style"]);

function wrapCitations(html: string): string {
  if (!html) return html;
  const tokenRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|[^<]+/g;
  const out: string[] = [];
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    const tok = m[0] ?? "";
    if (!tok) continue;
    if (tok.startsWith("<")) {
      const tag = (m[1] ?? "").toLowerCase();
      if (tok.startsWith("</")) {
        if (stack.length && stack[stack.length - 1] === tag) stack.pop();
      } else if (!tok.endsWith("/>") && !VOID_TAGS.has(tag)) {
        stack.push(tag);
      }
      out.push(tok);
    } else {
      const skip = stack.some((t) => CITATION_SKIP_TAGS.has(t));
      if (skip) {
        out.push(tok);
      } else {
        out.push(replaceCitations(tok));
      }
    }
  }
  return out.join("");
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function replaceCitations(text: string): string {
  let result = text;
  for (const re of CITATION_PATTERNS) {
    result = result.replace(re, (m) => `<span class="citation">${m}</span>`);
  }
  return result;
}

/* -----------------------------------------------------------------------------
 * Code highlighting (Shiki dual-theme)
 * -------------------------------------------------------------------------- */

async function highlightCodeBlocks(html: string): Promise<string> {
  if (!/<pre>\s*<code\s+class="language-/.test(html)) return html;
  let highlighter;
  try {
    highlighter = await getHighlighter();
  } catch {
    return html;
  }
  const loadedLangs = new Set(highlighter.getLoadedLanguages() as string[]);

  return html.replace(
    /<pre>\s*<code\s+class="language-([a-z0-9+#-]+)"\s*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match, langRaw: string, body: string) => {
      const lang = (langRaw ?? "text").toLowerCase();
      const useLang = loadedLangs.has(lang) ? lang : "text";
      const source = decodeText(body);
      try {
        const highlighted = highlighter.codeToHtml(source, {
          lang: useLang as never,
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
        // Add data-language attribute for the CSS label
        return highlighted.replace(/^<pre/, `<pre data-language="${escapeAttr(lang)}"`);
      } catch {
        return _match;
      }
    },
  );
}

/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function decodeText(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
