/** className helper — concatenate truthy strings only. */
export type Cls = string | false | null | undefined | Record<string, boolean | null | undefined>;

export function cn(...args: Cls[]): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === "string") {
      out.push(a);
    } else {
      for (const [k, v] of Object.entries(a)) {
        if (v) out.push(k);
      }
    }
  }
  return out.join(" ");
}
