import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

function loadEnvKey(key, fallback) {
  let value = '';
  try {
    const raw = fs.readFileSync('../.env.local', 'utf8');
    const m = raw.match(new RegExp(`^${key}=\\s*"([^"]*)"|^${key}=\\s*([^\\n]+)`, 'm'));
    if (m) value = (m[1] || m[2] || '').trim();
  } catch {}
  if (!value || (value.startsWith('[') && value.endsWith(']'))) {
    value = process.env[key] || fallback;
  }
  return value;
}

const apiKey = loadEnvKey('SHOPIFY_API_KEY', '21d39f659c134afb356bd8a74666a6a5');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-api-key',
      transformIndexHtml(html) {
        return html.replace(/%SHOPIFY_API_KEY%/g, apiKey);
      }
    }
  ],
  base: '/',
  define: {
    __CHICYA_API_KEY__: JSON.stringify(apiKey)
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
});