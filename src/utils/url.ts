// Astro's `base` config (set via the SITE_BASE env var, see astro.config.mjs)
// is a GitHub Pages-only concern: production deploys to the site's own domain
// root, while the GitHub Pages preview lives under /dr-stem-landing/. Astro
// does not rewrite hardcoded absolute paths on its own, so every root-relative
// href/src in the app must go through withBase() to work under both.
export const BASE = import.meta.env.BASE_URL;

export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  const prefix = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return prefix + path;
}
