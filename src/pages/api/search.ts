import type { APIRoute } from "astro";
import { searchPosts } from "@lib/wp/queries";
import { postPath, newsPath, pagePath } from "@lib/wp/url";
import { makeExcerpt, cleanWpExcerpt } from "@lib/utils/excerpt";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return json({ results: [] });
  }

  try {
    const data = await searchPosts(q, 24);
    const results = (data.posts?.nodes ?? []).map((p) => {
      const isNews = (p.categories?.nodes ?? []).some((c) => c.slug === "news");
      return {
        title: p.title,
        url: isNews ? newsPath(p.slug) : postPath(p.slug),
        type: isNews ? "news" : "post",
        excerpt: makeExcerpt(cleanWpExcerpt(p.excerpt) || p.content, 140),
      };
    });
    return json({ results });
  } catch (e) {
    return json({ results: [], error: (e as Error).message }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=30",
    },
  });
}

export function pagePathFor(slug: string) {
  return pagePath(slug);
}
