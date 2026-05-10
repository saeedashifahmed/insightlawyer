/**
 * WordPress / WPGraphQL type contracts. Hand-written to match the queries
 * in queries.ts. If the GraphQL schema drifts, regenerate with graphql-codegen.
 */

export type ID = string;

export interface WPMedia {
  id?: ID;
  sourceUrl: string;
  altText?: string;
  caption?: string;
  mediaDetails?: {
    width?: number;
    height?: number;
    sizes?: Array<{
      name: string;
      sourceUrl: string;
      width: number;
      height: number;
      mimeType?: string;
    }>;
  };
}

export interface WPAuthor {
  id?: ID;
  databaseId?: number;
  name: string;
  slug: string;
  description?: string;
  uri?: string;
  avatar?: { url: string };
  roles?: { nodes?: Array<{ displayName?: string; name?: string }> };
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface WPCategory {
  id?: ID;
  databaseId?: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  uri?: string;
  parent?: { node?: { slug: string; name: string } };
  customImage?: WPMedia;
}

export interface WPTag {
  id?: ID;
  databaseId?: number;
  name: string;
  slug: string;
  count?: number;
  uri?: string;
}

export interface WPSeoOpenGraph {
  title?: string;
  description?: string;
  url?: string;
  image?: { url?: string; secureUrl?: string; width?: number; height?: number; type?: string };
  type?: string;
  locale?: string;
  siteName?: string;
}

export interface WPSeoBreadcrumb {
  text: string;
  url: string;
}

export interface WPSeo {
  fullHead?: string;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  openGraph?: WPSeoOpenGraph;
  jsonLd?: { raw?: string };
  breadcrumbs?: WPSeoBreadcrumb[];
  robots?: { index?: boolean; follow?: boolean };
}

export interface WPPostBase {
  id: ID;
  databaseId?: number;
  slug: string;
  uri?: string;
  title: string;
  excerpt?: string;
  content?: string;
  date?: string;
  modified?: string;
  status?: string;
  featuredImage?: { node?: WPMedia };
  author?: { node?: WPAuthor };
  categories?: { nodes?: WPCategory[] };
  tags?: { nodes?: WPTag[] };
  seo?: WPSeo;
  commentCount?: number;
}

export interface WPPost extends WPPostBase {
  __typename?: "Post";
}

export interface WPPage extends WPPostBase {
  __typename?: "Page";
  isFrontPage?: boolean;
}

export interface WPNews extends WPPostBase {
  __typename?: "News";
  newsFields?: {
    source?: string;
    sourceUrl?: string;
    location?: string;
  };
}

export type WPContent = WPPost | WPPage | WPNews;

export interface WPPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface WPConnection<T> {
  nodes: T[];
  pageInfo?: WPPageInfo;
}

export interface WPMenuItem {
  id: ID;
  parentId?: string | null;
  label: string;
  url: string;
  uri?: string;
  path?: string;
  cssClasses?: string[];
  target?: string;
  children?: WPMenuItem[];
}

export interface WPMenu {
  id: ID;
  name: string;
  slug?: string;
  locations?: string[];
  items: WPMenuItem[];
}

export interface WPSiteOptions {
  title?: string;
  description?: string;
  url?: string;
  language?: string;
  logoUrl?: string;
  faviconUrl?: string;
}

export type ContentType = "post" | "page" | "news";

export interface ResolvedContent {
  type: ContentType;
  data: WPContent;
}
