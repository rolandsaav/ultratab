import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Palette builds as an HTML entry (ES-module + CSS), unlike the content build's IIFE lib.
/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: 'palette.html',
    },
    outDir: 'dist',
    emptyOutDir: false, // append into dist/; the content build already emptied it
    sourcemap: true,
  },
  resolve: {
    alias: {
      $lib: '/src',
    },
  },
});
