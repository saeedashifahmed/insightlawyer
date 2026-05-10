export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function makeExcerpt(input: string | null | undefined, max = 180): string {
  const txt = stripHtml(input);
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

/** Strip the `[…]` Read more glyph WP appends to auto-excerpts. */
export function cleanWpExcerpt(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/\[\&hellip;\]|\[…\]|\[\.\.\.\]/g, "…")
    .trim();
}
