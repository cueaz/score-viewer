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
const prefixIcons = `${prefixPublic}/ic`;

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
      injectRegister: 'inline',
      workbox: {
        globPatterns: [
          '**/*.{js,css,html}',
          `${prefixAssets}/**/*`,
          `${prefixPublic}/**/*`,
        ],
      },
      manifest: {
        name: 'Score Viewer',
        short_name: 'Score Viewer',
        description: 'A Simple PDF Viewer with MIDI Visualization',
        theme_color: '#cdcdcd',
        icons: [
          { src: 'favicon.ico', type: 'image/x-icon', sizes: '16x16 32x32' },
          {
            src: `${prefixIcons}/icon-192.png`,
            type: 'image/png',
            sizes: '192x192',
          },
          {
            src: `${prefixIcons}/icon-512.png`,
            type: 'image/png',
            sizes: '512x512',
          },
          {
            src: `${prefixIcons}/icon-192-maskable.png`,
            type: 'image/png',
            sizes: '192x192',
            purpose: 'maskable',
          },
          {
            src: `${prefixIcons}/icon-512-maskable.png`,
            type: 'image/png',
            sizes: '512x512',
            purpose: 'maskable',
          },
        ],
      },
    }),
    ViteMinifyPlugin(),
  ],
  build: {
    target: 'es2022',
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
