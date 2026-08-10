import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '__test__',
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@pkg', replacement: resolve(__dirname, 'pkg') }
    ]
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      allow: ['..']
    }
  },
  // Serve pkg directory for WASM files in dev mode
  publicDir: resolve(__dirname, 'pkg'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    minify: 'esbuild',
    rolldownOptions: {
      input: {
        main: resolve(__dirname, '__test__/index.html')
      }
    }
  }
})
