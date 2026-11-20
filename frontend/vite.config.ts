import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 3000,
  },
  plugins: [
    {
      name: 'dev-html-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index.src.html';
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // inline all assets including images up to 100MB
    chunkSizeWarningLimit: 100000,
    rollupOptions: {
      input: resolve(__dirname, 'index.src.html'),
    },
  },
})
