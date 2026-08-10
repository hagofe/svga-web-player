import { defineConfig } from 'tsdown'

const commonConfig = {
  format: ['esm'] as any,
  minify: true,
  outDir: 'dist',
  target: ['chrome60', 'safari11', 'firefox60', 'edge18'],
  define: {
    'import.meta.env.DEV': 'false'
  }
}

export default defineConfig([
  // Main library build
  {
    ...commonConfig,
    entry: ['src/index.ts'],
    dts: true,
    clean: true
  },
  // Worker build - separate to avoid code splitting
  {
    ...commonConfig,
    format: ['iife'],
    entry: { 'parser-worker': 'src/parser/index.ts' },
    platform: 'browser',
    noExternal: ['fflate'],
    unbundle: false,
    skipNodeModulesBundle: false,
    dts: false,
    clean: false
  }
])
