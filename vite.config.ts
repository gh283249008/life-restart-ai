import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: false,
    cors: true,
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/hunyuan/v1': {
        target: 'https://tokenhub.tencentmaas.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/hunyuan\/v1/, '/v1'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('hunyuan proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Hunyuan:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Hunyuan:', proxyRes.statusCode, req.url);
          });
        },
      },
    }
  }
})
