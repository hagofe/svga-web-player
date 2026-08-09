const VITE_OPTIMIZER_PATH = /\/node_modules\/\.vite\/deps(?:\/|$)/

const VITE_OPTIMIZER_DIAGNOSTIC =
  '[@hagoss/svga-web-player] Vite dependency optimization prevents the independent WASM/Worker resources from loading correctly. Add @hagoss/svga-web-player to optimizeDeps.exclude, then restart Vite with --force.'

let reported = false

export function reportViteOptimizerIntegrationDiagnostic(
  moduleUrl: string
): void {
  if (reported) return

  try {
    if (!VITE_OPTIMIZER_PATH.test(new URL(moduleUrl).pathname)) return
    reported = true
    console.error(VITE_OPTIMIZER_DIAGNOSTIC)
  } catch {
    // A development diagnostic must never replace the original parser result.
  }
}
