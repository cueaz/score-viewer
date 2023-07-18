import { defineConfig } from 'vite';

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
  server: {
    port: 3000,
  },
});
