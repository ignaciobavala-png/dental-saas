import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Sitio de marketing del producto (single-tenant). Estático por ahora.
// El deploy a Cloudflare Workers se cablea en el hito de marketing (ver docs/08, ADR-0009).
export default defineConfig({
  site: 'https://evoluciondental.com',
  server: {
    port: 4322,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
