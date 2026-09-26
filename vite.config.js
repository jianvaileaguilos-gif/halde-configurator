import { defineConfig } from 'vite';

// GitHub Pages serves the site from /halde-configurator/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/halde-configurator/' : '/',
}));
