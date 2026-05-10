/**
 * All GraphQL queries against WPGraphQL.
 * Wrappers below execute them and return strongly-typed results.
 */

import { wpQuery } from "./client";
import type {
  WPPost,
  WPPage,
  WPNews,
  WPCategory,
  WPTag,
  WPAuthor,
  WPMenu,
  WPMenuItem,
  WPSiteOptions,
  WPConnection,
  ResolvedContent,
} from "./types";

/* -----------------------------------------------------------------------------
 *  Fragments
 * -------------------------------------------------------------------------- */

const FRAG_MEDIA = /* GraphQL */ `
  fragment MediaFields on MediaItem {
    id
    sourceUrl
    altText
    caption
    mediaDetails {
      width
      height
      sizes {
        name
        sourceUrl
        width
        height
        mimeType
      }
    }
  }
`;

const FRAG_AUTHOR = /* GraphQL */ `
  fragment AuthorFields on User {
    id
    databaseId
    name
    slug
    description
    uri
    avatar { url }
    roles { nodes { name displayName } }
  }
`;

const FRAG_CATEGORY = /* GraphQL */ `
  fragment CategoryFields on Category {
    id
    databaseId
    name
    slug
    description
    count
    uri
    parent { node { name slug } }
  }
`;

const FRAG_TAG = /* GraphQL */ `
  fragment TagFields on Tag {
    id
    databaseId
    name
    slug
    count
    uri
  }
`;

/**
 * NOTE: SEO fields are intentionally omitted from these GraphQL queries.
 * They depend on a WPGraphQL connector for RankMath / Yoast that may not be
 * installed. SEO is sourced separately via /wp-json/rankmath/v1/getHead in
 * RankMathHead.astro, which falls back to FallbackSeo automatically.
 */

const FRAG_POST = /* GraphQL */ `
  fragment PostFields on Post {
    __typename
    id
    databaseId
    slug
    uri
    title
    excerpt
    content
    date
    modified
    commentCount
    featuredImage { node { ...MediaFields } }
    author { node { ...AuthorFields } }
    categories { nodes { ...CategoryFields } }
    tags { nodes { ...TagFields } }
  }
`;

const FRAG_PAGE = /* GraphQL */ `
  fragment PageFields on Page {
    __typename
    id
    databaseId
    slug
    uri
    title
    content
    date
    modified
    isFrontPage
    featuredImage { node { ...MediaFields } }
  }
`;

const FRAG_NEWS_FALLBACK = /* GraphQL */ `
  fragment NewsFields on Post {
    __typename
    id
    databaseId
    slug
    uri
    title
    excerpt
    content
    date
    modified
    featuredImage { node { ...MediaFields } }
    author { node { ...AuthorFields } }
    categories { nodes { ...CategoryFields } }
  }
`;

/**
 * WPGraphQL is strict about unused fragments — it errors if a query bundles
 * a fragment it does not reference. So each query composes only the fragments
 * it actually uses.
 */
const POST_FRAGMENTS = `${FRAG_MEDIA}\n${FRAG_AUTHOR}\n${FRAG_CATEGORY}\n${FRAG_TAG}\n${FRAG_POST}`;
const POST_PLUS_NEWS_FRAGMENTS = `${FRAG_MEDIA}\n${FRAG_AUTHOR}\n${FRAG_CATEGORY}\n${FRAG_TAG}\n${FRAG_POST}\n${FRAG_NEWS_FALLBACK}`;
const NEWS_FRAGMENTS = `${FRAG_MEDIA}\n${FRAG_AUTHOR}\n${FRAG_CATEGORY}\n${FRAG_NEWS_FALLBACK}`;
const PAGE_FRAGMENTS = `${FRAG_MEDIA}\n${FRAG_PAGE}`;

/* -----------------------------------------------------------------------------
 *  Queries
 * -------------------------------------------------------------------------- */

const Q_HOME = /* GraphQL */ `
  ${POST_PLUS_NEWS_FRAGMENTS}
  query GetHome {
    latest: posts(first: 16, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostFields }
    }
    news: posts(first: 4, where: { categoryName: "legal-updates", status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      nodes { ...NewsFields }
    }
    editorPicks: posts(first: 6, where: { categoryName: "editorials", status: PUBLISH }) {
      nodes { ...PostFields }
    }
    practiceAreas: categories(first: 12, where: { hideEmpty: true, exclude: [1] }) {
      nodes { ...CategoryFields }
    }
  }
`;

const Q_POSTS_PAGE = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query GetPostsPage($first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes { ...PostFields }
    }
  }
`;

const Q_POST_BY_SLUG = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) { ...PostFields }
  }
`;

const Q_PAGE_BY_SLUG = /* GraphQL */ `
  ${PAGE_FRAGMENTS}
  query GetPageBySlug($slug: ID!) {
    page(id: $slug, idType: URI) { ...PageFields }
  }
`;

const Q_NEWS_PAGE = /* GraphQL */ `
  ${NEWS_FRAGMENTS}
  query GetNewsPage($first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { categoryName: "legal-updates", status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      pageInfo { hasNextPage endCursor }
      nodes { ...NewsFields }
    }
  }
`;

const Q_NEWS_BY_SLUG = /* GraphQL */ `
  ${NEWS_FRAGMENTS}
  query GetNewsBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) { ...NewsFields }
  }
`;

const Q_CATEGORY_BY_SLUG = /* GraphQL */ `
  ${FRAG_CATEGORY}
  query GetCategory($slug: ID!) {
    category(id: $slug, idType: SLUG) { ...CategoryFields }
  }
`;

const Q_POSTS_BY_CATEGORY = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query GetPostsByCategory($slug: String!, $first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { categoryName: $slug, status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      pageInfo { hasNextPage endCursor }
      nodes { ...PostFields }
    }
  }
`;

const Q_TAG_BY_SLUG = /* GraphQL */ `
  ${FRAG_TAG}
  query GetTag($slug: ID!) {
    tag(id: $slug, idType: SLUG) { ...TagFields }
  }
`;

const Q_POSTS_BY_TAG = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query GetPostsByTag($slug: String!, $first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { tag: $slug, status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      pageInfo { hasNextPage endCursor }
      nodes { ...PostFields }
    }
  }
`;

const Q_AUTHOR_BY_SLUG = /* GraphQL */ `
  ${FRAG_AUTHOR}
  query GetAuthor($slug: ID!) {
    user(id: $slug, idType: SLUG) { ...AuthorFields }
  }
`;

const Q_POSTS_BY_AUTHOR = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query GetPostsByAuthor($slug: String!, $first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { authorName: $slug, status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
      pageInfo { hasNextPage endCursor }
      nodes { ...PostFields }
    }
  }
`;

const Q_MENU = /* GraphQL */ `
  query GetMenu($location: MenuLocationEnum!) {
    menuItems(where: { location: $location, parentId: "0" }, first: 50) {
      nodes {
        id
        parentId
        label
        url
        uri
        path
        cssClasses
        target
        childItems(first: 30) {
          nodes {
            id
            parentId
            label
            url
            uri
            path
            cssClasses
            target
          }
        }
      }
    }
  }
`;

const Q_SITE_OPTIONS = /* GraphQL */ `
  query GetSiteOptions {
    generalSettings {
      title
      description
      url
      language
    }
  }
`;

const Q_SEARCH = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query SearchPosts($q: String!, $first: Int = 20) {
    posts(first: $first, where: { search: $q, status: PUBLISH }) {
      nodes { ...PostFields }
    }
  }
`;

const Q_RELATED = /* GraphQL */ `
  ${POST_FRAGMENTS}
  query Related($slug: String!, $excludeId: [ID], $first: Int = 4) {
    posts(first: $first, where: { categoryName: $slug, status: PUBLISH, notIn: $excludeId, orderby: { field: DATE, order: DESC } }) {
      nodes { ...PostFields }
    }
  }
`;

/* -----------------------------------------------------------------------------
 *  Wrappers
 * -------------------------------------------------------------------------- */

export interface HomeData {
  latest: { nodes: WPPost[] };
  news: { nodes: WPNews[] };
  editorPicks: { nodes: WPPost[] };
  practiceAreas: { nodes: WPCategory[] };
}

export async function getHome(): Promise<HomeData> {
  return wpQuery<HomeData>(Q_HOME, {}, { name: "GetHome", revalidate: 60 });
}

export async function getPostsPage(first = 12, after?: string): Promise<{ posts: WPConnection<WPPost> }> {
  return wpQuery<{ posts: WPConnection<WPPost> }>(
    Q_POSTS_PAGE,
    { first, after: after ?? null },
    { name: "GetPostsPage", revalidate: 60 },
  );
}

export async function getPostBySlug(slug: string): Promise<{ post: WPPost | null }> {
  return wpQuery<{ post: WPPost | null }>(Q_POST_BY_SLUG, { slug }, { name: "GetPostBySlug", revalidate: 300 });
}

export async function getPageBySlug(slug: string): Promise<{ page: WPPage | null }> {
  return wpQuery<{ page: WPPage | null }>(Q_PAGE_BY_SLUG, { slug }, { name: "GetPageBySlug", revalidate: 300 });
}

export async function getNewsPage(first = 12, after?: string): Promise<{ posts: WPConnection<WPNews> }> {
  return wpQuery<{ posts: WPConnection<WPNews> }>(
    Q_NEWS_PAGE,
    { first, after: after ?? null },
    { name: "GetNewsPage", revalidate: 30 },
  );
}

export async function getNewsBySlug(slug: string): Promise<{ post: WPNews | null }> {
  return wpQuery<{ post: WPNews | null }>(Q_NEWS_BY_SLUG, { slug }, { name: "GetNewsBySlug", revalidate: 60 });
}

export async function getCategoryBySlug(slug: string): Promise<{ category: WPCategory | null }> {
  return wpQuery<{ category: WPCategory | null }>(Q_CATEGORY_BY_SLUG, { slug }, { name: "GetCategory", revalidate: 600 });
}

export async function getPostsByCategory(slug: string, first = 12, after?: string) {
  return wpQuery<{ posts: WPConnection<WPPost> }>(
    Q_POSTS_BY_CATEGORY,
    { slug, first, after: after ?? null },
    { name: "GetPostsByCategory", revalidate: 60 },
  );
}

export async function getTagBySlug(slug: string): Promise<{ tag: WPTag | null }> {
  return wpQuery<{ tag: WPTag | null }>(Q_TAG_BY_SLUG, { slug }, { name: "GetTag", revalidate: 600 });
}

export async function getPostsByTag(slug: string, first = 12, after?: string) {
  return wpQuery<{ posts: WPConnection<WPPost> }>(
    Q_POSTS_BY_TAG,
    { slug, first, after: after ?? null },
    { name: "GetPostsByTag", revalidate: 60 },
  );
}

export async function getAuthorBySlug(slug: string): Promise<{ user: WPAuthor | null }> {
  return wpQuery<{ user: WPAuthor | null }>(Q_AUTHOR_BY_SLUG, { slug }, { name: "GetAuthor", revalidate: 600 });
}

export async function getPostsByAuthor(slug: string, first = 12, after?: string) {
  return wpQuery<{ posts: WPConnection<WPPost> }>(
    Q_POSTS_BY_AUTHOR,
    { slug, first, after: after ?? null },
    { name: "GetPostsByAuthor", revalidate: 60 },
  );
}

export async function getMenu(location: string): Promise<WPMenu> {
  type Resp = {
    menuItems: {
      nodes: Array<
        Omit<WPMenuItem, "children"> & {
          childItems?: { nodes: WPMenuItem[] };
        }
      >;
    };
  };
  const data = await wpQuery<Resp>(
    Q_MENU,
    { location },
    { name: `GetMenu:${location}`, revalidate: 600 },
  );
  const items: WPMenuItem[] = (data.menuItems?.nodes ?? []).map((n) => ({
    id: n.id,
    parentId: n.parentId ?? null,
    label: n.label,
    url: n.url,
    uri: n.uri,
    path: n.path,
    cssClasses: n.cssClasses,
    target: n.target,
    children: n.childItems?.nodes ?? [],
  }));
  return { id: location, name: location, locations: [location], items };
}

export async function getSiteOptions(): Promise<WPSiteOptions> {
  type Resp = {
    generalSettings?: {
      title?: string;
      description?: string;
      url?: string;
      language?: string;
    };
  };
  const data = await wpQuery<Resp>(Q_SITE_OPTIONS, {}, { name: "GetSiteOptions", revalidate: 600 });
  return {
    title: data.generalSettings?.title ?? import.meta.env.PUBLIC_SITE_NAME,
    description: data.generalSettings?.description ?? import.meta.env.PUBLIC_SITE_TAGLINE,
    url: data.generalSettings?.url ?? import.meta.env.PUBLIC_SITE_URL,
    language: data.generalSettings?.language ?? "en-IN",
  };
}

export async function searchPosts(q: string, first = 20): Promise<{ posts: { nodes: WPPost[] } }> {
  return wpQuery<{ posts: { nodes: WPPost[] } }>(
    Q_SEARCH,
    { q, first },
    { name: "SearchPosts", revalidate: 30 },
  );
}

export async function getRelatedPosts(categorySlug: string, excludeId: string, first = 4): Promise<WPPost[]> {
  type Resp = { posts: { nodes: WPPost[] } };
  const data = await wpQuery<Resp>(
    Q_RELATED,
    { slug: categorySlug, excludeId: [excludeId], first },
    { name: "Related", revalidate: 300 },
  );
  return data.posts?.nodes ?? [];
}

/**
 * Resolve a slug as post → page → news. Returns null if all 404.
 */
export async function resolveContentBySlug(slug: string): Promise<ResolvedContent | null> {
  const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
  // Try post first
  try {
    const r = await getPostBySlug(cleanSlug);
    if (r.post) return { type: "post", data: r.post };
  } catch {
    /* swallow and try next */
  }
  // Then page
  try {
    const r = await getPageBySlug(cleanSlug);
    if (r.page) return { type: "page", data: r.page };
  } catch {
    /* swallow and try next */
  }
  // Then news (treated as a category-tagged post in this fallback schema)
  try {
    const r = await getNewsBySlug(cleanSlug);
    if (r.post) return { type: "news", data: r.post };
  } catch {
    /* swallow */
  }
  return null;
}
