import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://paydecode.pages.dev').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
