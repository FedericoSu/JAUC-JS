import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:5038' }
  },
  preview: {
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:5038' }
  }
});
