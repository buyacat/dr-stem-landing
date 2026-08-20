import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
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
