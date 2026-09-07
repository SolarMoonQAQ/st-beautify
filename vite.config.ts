import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import * as path from "node:path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    tailwindcss()
  ],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'CangXuanJiePlugin',
      fileName: () => 'index.js',
      formats: ['es']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
