/**
 * GraphQL client for WPGraphQL — tiny wrapper around fetch with retries,
 * timeout, and an in-memory cache. Falls back to mock data when
 * WP_USE_MOCK=1 is set in the environment.
 */

import { cacheGet, cacheSet, hashKey } from "./cache";

const ENDPOINT = import.meta.env.WP_GRAPHQL_ENDPOINT ?? "https://cms.insightlawyer.in/graphql";
const REST_BASE = import.meta.env.WP_REST_BASE ?? "https://cms.insightlawyer.in/wp-json";
const USE_MOCK = import.meta.env.WP_USE_MOCK === "1" || import.meta.env.WP_USE_MOCK === "true";

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [250, 750];

export interface QueryOptions {
  /** TTL in seconds. 0 disables caching. Default: 60. */
  revalidate?: number;
  /** Tag for grouped invalidation by /api/revalidate. */
  tag?: string;
  /** Bypass cache. */
  fresh?: boolean;
  /** A friendly query name for logs. */
  name?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadMock<T>(name: string, vars: Record<string, unknown>): Promise<T | null> {
  try {
    const mod = await import(`../../../mock/${name}.json`);
    const data = (mod.default ?? mod) as T;
    if (typeof console !== "undefined") {
      console.info(`[wp:mock] ${name}`, Object.keys(vars));
    }
    return data;
  } catch {
    return null;
  }
}

export interface WpClientError extends Error {
  status?: number;
  query?: string;
}

function makeError(message: string, status?: number, query?: string): WpClientError {
  const err = new Error(message) as WpClientError;
  if (status !== undefined) err.status = status;
  if (query) err.query = query.slice(0, 120);
  return err;
}

async function postGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });

    if ([502, 503, 504].includes(res.status) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[attempt] ?? 750);
      return postGraphql<T>(query, variables, attempt + 1);
    }

    if (!res.ok) {
      throw makeError(`WPGraphQL HTTP ${res.status}`, res.status, query);
    }

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message).join("; ");
      throw makeError(`WPGraphQL errors: ${msg}`, res.status, query);
    }
    if (!json.data) throw makeError("WPGraphQL returned no data", res.status, query);
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Run a GraphQL query against WPGraphQL. */
export async function wpQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: QueryOptions = {},
): Promise<T> {
  const name = opts.name ?? "anonymous";

  if (USE_MOCK) {
    const mocked = await loadMock<T>(name, variables);
    if (mocked) return mocked;
    // fall through to live fetch if no mock file is present
  }

  const ttl = opts.revalidate ?? 60;
  const cacheKey = `gql:${name}:${await hashKey(query + JSON.stringify(variables))}`;

  if (!opts.fresh && ttl > 0) {
    const hit = cacheGet<T>(cacheKey);
    if (hit !== undefined) return hit;
  }

  try {
    const data = await postGraphql<T>(query, variables);
    if (ttl > 0) cacheSet(cacheKey, data, ttl, opts.tag);
    return data;
  } catch (err) {
    const e = err as WpClientError;
    console.error(
      `[wp:gql] failed name=${name} status=${e.status ?? "-"} msg=${e.message} vars=${JSON.stringify(variables).slice(0, 200)}`,
    );
    throw err;
  }
}

/** Force-fresh variant used by webhook revalidation. */
export async function wpQueryFresh<T>(
  query: string,
  variables: Record<string, unknown> = {},
  opts: QueryOptions = {},
): Promise<T> {
  return wpQuery<T>(query, variables, { ...opts, fresh: true });
}

/** REST helper for endpoints WPGraphQL does not expose (sitemaps, RankMath head, etc.). */
export async function wpRest<T>(
  path: string,
  init: RequestInit = {},
  opts: QueryOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${REST_BASE.replace(/\/$/, "")}${path}`;
  const ttl = opts.revalidate ?? 60;
  const cacheKey = `rest:${opts.name ?? path}:${await hashKey(url + JSON.stringify(init.body ?? ""))}`;

  if (!opts.fresh && ttl > 0) {
    const hit = cacheGet<T>(cacheKey);
    if (hit !== undefined) return hit;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      signal: ctrl.signal,
    });
    if (!res.ok) throw makeError(`WP REST HTTP ${res.status} ${url}`, res.status, path);
    const ct = res.headers.get("content-type") ?? "";
    const data = (ct.includes("application/json") ? await res.json() : await res.text()) as T;
    if (ttl > 0) cacheSet(cacheKey, data, ttl, opts.tag);
    return data;
  } catch (err) {
    console.error(`[wp:rest] failed url=${url} msg=${(err as Error).message}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { ENDPOINT as WP_GRAPHQL_ENDPOINT, REST_BASE as WP_REST_BASE };
