import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 produit un seul fichier HTML (tout inline) pour un partage facile.
export default defineConfig({
  base: './',
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  build: { assetsInlineLimit: 200000, chunkSizeWarningLimit: 2000 },
});
