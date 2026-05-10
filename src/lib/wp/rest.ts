/**
 * REST fallbacks for things WPGraphQL does not expose well:
 *   - Sitemap proxy
 *   - Menu items via wp/v2 menus (when WPGraphQL menu queries fail)
 *   - Misc raw REST helpers
 */

import { wpRest } from "./client";

export async function getSitemapXml(): Promise<string> {
  const xml = await wpRest<string>(
    "/sitemap_index.xml",
    { headers: { Accept: "application/xml" } },
    { name: "SitemapIndex", revalidate: 600 },
  );
  return xml;
}

export async function getRawSitemap(path: string): Promise<string> {
  // path looks like "/sitemap-posts-1.xml"
  const xml = await wpRest<string>(
    path.startsWith("/") ? path : `/${path}`,
    { headers: { Accept: "application/xml" } },
    { name: `Sitemap:${path}`, revalidate: 600 },
  );
  return xml;
}

export interface WpRestMenuItem {
  ID: number;
  title: string;
  url: string;
  menu_item_parent: string;
  type: string;
  object: string;
}

export async function getMenuItemsRest(): Promise<WpRestMenuItem[]> {
  return wpRest<WpRestMenuItem[]>(
    "/wp/v2/menu-items?per_page=100",
    {},
    { name: "MenuItemsRest", revalidate: 600 },
  ).catch(() => []);
}
