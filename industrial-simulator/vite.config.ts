import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const studioCsp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'studio-csp',
      transformIndexHtml(html, ctx) {
        if (!ctx.bundle) {
          return html;
        }
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${studioCsp}" />`
        );
      }
    }
  ],
  build: {
    outDir: 'dist/studio/renderer',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
