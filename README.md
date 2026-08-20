# Dr.STEM Landing

Dr.STEM landing page with bilingual support (Ukrainian / English) built with **Astro**.

## Project Structure

```
src/
  layouts/
    MainLayout.astro    # HTML shell, <head>, fonts, OG tags, hreflang
  pages/
    index.astro         # Ukrainian version
    en.astro            # English version
  components/
    Nav.astro           # Top navigation
    DotNav.astro        # Floating section navigation
    Hero.astro          # Hero section
    Advantages.astro    # Advantages grid
    Includes.astro      # What includes section
    Kits.astro          # Kit tabs + panels
    Software.astro      # Software section
    AI.astro            # AI consultant section
    Game.astro          # Game mode section
    CTA.astro           # Order form + catalog card
    Footer.astro        # Inline footer
    KitTab.astro        # Kit tab button
    KitPanel.astro      # Kit detail panel
  data/
    locales.json        # All translations (UK / EN)
  styles/
    style.css           # Existing CSS (unchanged)
  utils/
    i18n.ts             # Tiny translation helper
public/
  assets/               # Logo SVGs, app.js
  images/               # All images
  send.php              # Form handler
  favicon.png
dist/                   # Build output (generated)
```

## Build Commands

```bash
# Install dependencies
npm install

# Dev server with hot reload
npm run dev

# Production build (links to app.drstem.eu)
npm run build

# Dev build (links to app-dev.drstem.eu)
npm run build:dev

# Production build (explicit)
npm run build:prod

# Preview built files
npm run preview
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DRSTEM_APP_URL` | `https://app.drstem.eu/#/` | Full URL to the cabinet app |

## i18n

All text lives in `src/data/locales.json`. Components receive a `locale` prop (`'uk'` or `'en'`) and use the `t()` helper to pull translations. No external i18n library needed.

## SEO

- `hreflang` alternate links for both languages
- `og:locale` set per page (`uk_UA` / `en_US`)
- OG tags generated from `locales.json`

## Deployment

Deploy the contents of `dist/` to your web server. The build automatically:
- Injects `DRSTEM_APP_URL` and `DRSTEM_APP_DOMAIN` into the page
- Copies all assets and images to the output directory
- Generates both `index.html` (Ukrainian) and `en.html` (English)
- `send.php` is served from `public/` as-is

## Translation Panel

A browser-based translation editor is available at `/admin/` after build.

### How it works
- The panel is a static page shipped with the site. It talks directly to the Bitbucket Cloud REST API from the browser.
- Authentication uses a single **Bitbucket Repository Access Token** (created once in the repo settings with `repository:write` scope). Editors paste the token into the panel; it is stored in `localStorage` and never appears in the site bundle.
- Every save becomes a real git commit on `main` — full history, revertability, and author trail for free.

### Publishing remains manual
The panel only writes commits to the repository. A developer must still:
1. `git pull` the latest commits
2. `npm run build:prod`
3. Upload the contents of `dist/` to the web server

There is no CI or auto-deploy.

## Migration from Vite

The old Vite-based source files (`src/index.html`, `src/en.html`, `vite.config.js`) have been removed. The project now uses Astro's static site generation with zero client-side JS overhead (except for the existing `app.js` interactions).
