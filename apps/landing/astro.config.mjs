import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Maqueta: sin adaptador de Cloudflare todavía (output estático).
// En H4 se agrega `@astrojs/cloudflare` (SSR + imageService: 'compile').
export default defineConfig({
  site: 'https://odontologiaarocena.com.ar',
  vite: {
    plugins: [tailwindcss()],
  },
});
