import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'src/main/index.ts',
        vite: {
          resolve: {
            alias: {
              '@': resolve(__dirname, './src'),
              '@main': resolve(__dirname, './src/main'),
              '@renderer': resolve(__dirname, './src/renderer'),
              '@shared': resolve(__dirname, './src/shared'),
              '@cli': resolve(__dirname, './src/cli'),
            },
          },
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'src/main/index.ts',
              formats: ['cjs'],
              fileName: () => 'main.js',
            },
            rollupOptions: {
              external: [
                'electron',
                'better-sqlite3',
                'electron-store',
                'spotify-web-api-node',
                'dotenv',
              ],
            },
          },
        },
      },
      {
        // Preload script entry point
        entry: 'src/main/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload();
        },
        vite: {
          resolve: {
            alias: {
              '@': resolve(__dirname, './src'),
              '@main': resolve(__dirname, './src/main'),
              '@renderer': resolve(__dirname, './src/renderer'),
              '@shared': resolve(__dirname, './src/shared'),
              '@cli': resolve(__dirname, './src/cli'),
            },
          },
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'src/main/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@main': resolve(__dirname, './src/main'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@shared': resolve(__dirname, './src/shared'),
      '@cli': resolve(__dirname, './src/cli'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['electron'],
    },
  },
});
