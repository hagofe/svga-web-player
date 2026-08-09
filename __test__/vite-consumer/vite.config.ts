import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const excludeFromOptimizer = process.env.SVGA_VERIFY_EXCLUDE === '1'
const fixtureRoot = process.env.SVGA_VERIFY_ROOT ?? import.meta.dirname

export default defineConfig({
  assetsInclude: ['**/*.svga'],
  optimizeDeps: excludeFromOptimizer
    ? { exclude: ['@hagoss/svga-web-player'] }
    : {
        // The real incident requires the installed package to be prebundled.
        // `include` makes this deterministic even when the fixture is prepared
        // from a local package tarball rather than the npm registry.
        include: ['@hagoss/svga-web-player']
      },
  server: {
    fs: {
      allow: [resolve(fixtureRoot, '..')]
    }
  },
  build: {
    outDir: resolve(fixtureRoot, 'dist'),
    emptyOutDir: true
  }
})
