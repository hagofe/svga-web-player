/**
 * WASM Loader
 *
 * Delegates to wasm-pack generated init() which uses
 * `new URL('svga_wasm_bg.wasm', import.meta.url)` internally.
 */

import init, * as wasm from '../../pkg/svga_wasm.js'

let initPromise: Promise<unknown> | null = null

/**
 * Initialize the WASM module (idempotent)
 * Returns the wasm bindings after initialization
 */
export async function initWasm() {
  if (!initPromise) {
    // init() uses its internal new URL pattern to locate the wasm file
    initPromise = init()
  }
  await initPromise
  return wasm
}

export { wasm }
