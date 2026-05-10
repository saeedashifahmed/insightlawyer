/** Social share URL builders. */

export function shareLinks(opts: { url: string; title: string; via?: string }) {
  const u = encodeURIComponent(opts.url);
  const t = encodeURIComponent(opts.title);
  const via = opts.via ? `&via=${encodeURIComponent(opts.via)}` : "";
  return {
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}${via}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    email: `mailto:?subject=${t}&body=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
  };
}
