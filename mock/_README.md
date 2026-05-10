# Mock fixtures

These JSON files mirror the shape of WPGraphQL responses for each named query in `src/lib/wp/queries.ts`. They are loaded automatically when `WP_USE_MOCK=1` is set in the environment.

The file name must match the `name` passed to `wpQuery()`. For example, `GetHome.json` is loaded for `getHome()`, `GetPostsPage.json` for `getPostsPage()`, etc.

If a mock file is not present for a given query, the live WP endpoint is used as a fallback.
