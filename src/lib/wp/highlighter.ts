/**
 * Lazy-loaded Shiki highlighter shared across renders.
 * Dual-theme (light/dark) with the most common languages used in legal blogs.
 */

import { createHighlighter, type Highlighter } from "shiki";

let instance: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  if (!instance) {
    instance = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "text",
        "javascript",
        "typescript",
        "json",
        "html",
        "css",
        "bash",
        "shell",
        "python",
        "sql",
        "yaml",
        "markdown",
        "diff",
      ],
    });
  }
  return instance;
}
