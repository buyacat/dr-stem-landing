import { defineConfig } from 'astro/config';

// Production deploys to the site's own domain root. The GitHub Pages preview
// (buyacat.github.io/dr-stem-landing/) needs its own base path instead —
// set via `npm run build:pages`, never hardcoded here.
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  output: 'static',
  base,
  build: {
    format: 'directory',
    inlineStylesheets: 'always'
  },
  vite: {
    server: {
      allowedHosts: ['eddy-drsteam.test']
    }
  }
});
