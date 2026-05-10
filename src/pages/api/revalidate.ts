import type { APIRoute } from "astro";
import { cacheClearAll, cacheClearByPrefix, cacheClearByTag } from "@lib/wp/cache";

export const prerender = false;

const SECRET = import.meta.env.REVALIDATE_SECRET ?? "change-me";

interface Body {
  paths?: string[];
  tags?: string[];
  /** When true, clear everything. */
  all?: boolean;
}

export const POST: APIRoute = async ({ request, url }) => {
  const secret = url.searchParams.get("secret") ?? request.headers.get("x-revalidate-secret");
  if (secret !== SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    /* empty body */
  }

  let cleared = 0;
  if (body.all) {
    cacheClearAll();
    return json({ ok: true, cleared: "all" });
  }

  for (const tag of body.tags ?? []) cleared += cacheClearByTag(tag);
  for (const path of body.paths ?? []) cleared += cacheClearByPrefix(`gql:GetPost:${path}`);

  return json({ ok: true, cleared });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
