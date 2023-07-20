import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import autoprefixer from 'autoprefixer';

const require = createRequire(import.meta.url);
const prefix = '_';

const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.join(pdfjsRoot, 'cmaps'),
          dest: prefix,
          rename: 'cm',
        },
        {
          src: path.join(pdfjsRoot, 'standard_fonts'),
          dest: prefix,
          rename: 'sf',
        },
      ],
    }),
    ViteMinifyPlugin(),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `${prefix}/[hash:8].js`,
        chunkFileNames: `${prefix}/[hash:8].js`,
        assetFileNames: `${prefix}/[hash:8].[ext]`,
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
  preview: {
    port: 3001,
  },
});
