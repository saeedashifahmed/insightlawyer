import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { getPostsPage } from "@lib/wp/queries";
import { postPath } from "@lib/wp/url";
import { isoDate } from "@lib/utils/date";
import { cleanWpExcerpt, makeExcerpt } from "@lib/utils/excerpt";
import { enhanceWpHtml } from "@lib/wp/enhance-html";

export const prerender = false;

const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? "https://insightlawyer.in").replace(/\/$/, "");
const SITE_NAME = import.meta.env.PUBLIC_SITE_NAME ?? "Insight Lawyer";

export const GET: APIRoute = async () => {
  const data = await getPostsPage(30).catch(() => null);
  const posts = data?.posts?.nodes ?? [];

  const items = await Promise.all(
    posts.map(async (p) => ({
      title: p.title,
      pubDate: p.date ? new Date(p.date) : new Date(),
      description: makeExcerpt(cleanWpExcerpt(p.excerpt) || p.content, 280),
      link: postPath(p.slug),
      categories: (p.categories?.nodes ?? []).map((c) => c.name),
      author: p.author?.node?.name,
      content: await enhanceWpHtml(p.content ?? "", { highlight: false }),
    })),
  );

  return rss({
    title: SITE_NAME,
    description: "Indian law, clearly explained — case analysis, judgments, news.",
    site: SITE_URL,
    items,
    customData: `<language>en-IN</language>`,
    xmlns: { content: "http://purl.org/rss/1.0/modules/content/" },
  });
};
