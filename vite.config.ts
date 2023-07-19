import { defineConfig } from 'vite';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '_/[hash:8].js',
        chunkFileNames: '_/[hash:8].js',
        assetFileNames: '_/[hash:8].[ext]',
      },
    },
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  server: {
    port: 3000,
  },
});
