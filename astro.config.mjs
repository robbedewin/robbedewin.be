// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://robbedewin.be',
  trailingSlash: 'ignore',
  integrations: [sitemap(), svelte()],
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
