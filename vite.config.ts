import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/blockscout/optimex-mainnet': {
        target: 'https://scan.optimex.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockscout\/optimex-mainnet/, '/api'),
      },
      '/api/blockscout/optimex-testnet': {
        target: 'https://scan-testnet.optimex.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blockscout\/optimex-testnet/, '/api'),
      },
    },
  },
});
