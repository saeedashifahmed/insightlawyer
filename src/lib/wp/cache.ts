/**
 * Tiny in-memory LRU cache for GraphQL/REST responses.
 * TTLs are short by design (60s lists, 300s singles). The /api/revalidate
 * webhook clears entries by tag/path when WP content changes.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
  tag?: string;
}

const MAX = 500;
const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return undefined;
  if (e.expiresAt && e.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  store.delete(key);
  store.set(key, e);
  return e.value;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number, tag?: string): void {
  if (store.size >= MAX) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, {
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : Number.POSITIVE_INFINITY,
    tag,
  });
}

export function cacheClearByTag(tag: string): number {
  let n = 0;
  for (const [k, v] of store.entries()) {
    if (v.tag === tag) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

export function cacheClearByPrefix(prefix: string): number {
  let n = 0;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

export function cacheClearAll(): void {
  store.clear();
}

export async function hashKey(input: string): Promise<string> {
  // Use Web Crypto when available; fall back to simple polyfill hash
  try {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16);
  }
}
