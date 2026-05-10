/**
 * Server-side sanitizer for WordPress HTML content.
 * Strict allow-list. Only trust HTML coming from the CMS.
 */

import sanitizeHtml from "sanitize-html";

const ALLOWED_IFRAME_HOSTS = new Set<string>([
  "www.youtube.com",
  "youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "platform.twitter.com",
  "publish.twitter.com",
  "www.indianlegallive.com",
  "www.scribd.com",
  "scribd.com",
  "open.spotify.com",
  "w.soundcloud.com",
]);

export function sanitizeWpHtml(input: string): string {
  if (!input) return "";
  return sanitizeHtml(input, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "span", "a", "ul", "ol", "li",
      "blockquote", "cite", "q",
      "strong", "em", "b", "i", "u", "s", "small", "sup", "sub",
      "br", "hr",
      "img", "figure", "figcaption", "picture", "source",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      "code", "pre", "kbd", "samp", "var",
      "div", "section", "article", "header", "footer", "aside",
      "iframe", "video", "audio", "track",
      "dl", "dt", "dd",
      "abbr", "address", "time",
      "details", "summary",
    ],
    allowedAttributes: {
      "*": ["id", "class", "style", "data-*", "lang", "dir", "title", "role", "aria-*"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"],
      source: ["src", "srcset", "sizes", "type", "media"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "loading"],
      video: ["src", "controls", "poster", "preload", "width", "height"],
      audio: ["src", "controls", "preload"],
      track: ["src", "kind", "srclang", "label", "default"],
      time: ["datetime"],
      th: ["scope", "colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      blockquote: ["cite"],
      q: ["cite"],
      abbr: ["title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-style": [/^italic$|^normal$/],
        "font-weight": [/^\d{3}$|^bold$|^normal$/],
      },
    },
    transformTags: {
      iframe: (tagName, attribs) => {
        const src = attribs["src"] ?? "";
        try {
          const u = new URL(src);
          if (!ALLOWED_IFRAME_HOSTS.has(u.host)) {
            return { tagName: "p", text: "" };
          }
        } catch {
          return { tagName: "p", text: "" };
        }
        return {
          tagName: "iframe",
          attribs: {
            ...attribs,
            loading: "lazy",
            allowfullscreen: "true",
            referrerpolicy: "strict-origin-when-cross-origin",
          },
        };
      },
    },
    // Keep <style> blocks out — they shouldn't leak from CMS into the article
    disallowedTagsMode: "discard",
  });
}
