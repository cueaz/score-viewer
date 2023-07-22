import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import autoprefixer from 'autoprefixer';

const require = createRequire(import.meta.url);

const prefixAssets = '_';
const prefixPublic = '-';

const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.join(pdfjsRoot, 'cmaps'),
          dest: prefixPublic,
          rename: 'cm',
        },
        {
          src: path.join(pdfjsRoot, 'standard_fonts'),
          dest: prefixPublic,
          rename: 'sf',
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: [
          '**/*.{js,css,html}',
          `${prefixAssets}/**/*`,
          `${prefixPublic}/**/*`,
        ],
      },
    }),
    ViteMinifyPlugin(),
  ],
  build: {
    assetsDir: prefixAssets,
    rollupOptions: {
      output: {
        entryFileNames: `${prefixAssets}/[hash:8].js`,
        chunkFileNames: `${prefixAssets}/[hash:8].js`,
        assetFileNames: `${prefixAssets}/[hash:8].[ext]`,
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
