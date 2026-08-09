import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const optimizedModuleUrl =
  'http://localhost:5173/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=test'
const fixtureBuffer = readFileSync(
  new URL('./svga/kaola.svga', import.meta.url)
)

class FakeXMLHttpRequest {
  public response: ArrayBuffer | undefined
  public responseType: XMLHttpRequestResponseType = ''
  public status = 200
  public statusText = 'OK'
  public onloadend: ((event: ProgressEvent) => void) | null = null

  open(): void {}

  send(): void {
    this.response = fixtureBuffer.buffer.slice(
      fixtureBuffer.byteOffset,
      fixtureBuffer.byteOffset + fixtureBuffer.byteLength
    )
    this.onloadend?.({} as ProgressEvent)
  }
}

class FailingWorker {
  constructor() {
    throw new Error('Worker script unavailable')
  }
}

async function importParsersInOptimizedModule() {
  // Vitest loads source files from file URLs. This wrapper changes only the
  // bundler-owned module URL while retaining the real diagnostic and its state.
  vi.doMock('../src/vite-optimizer-diagnostic', async (importOriginal) => {
    const actual =
      await importOriginal<typeof import('../src/vite-optimizer-diagnostic')>()
    return {
      ...actual,
      reportViteOptimizerIntegrationDiagnostic: () =>
        actual.reportViteOptimizerIntegrationDiagnostic(optimizedModuleUrl)
    }
  })
  vi.doMock('../src/wasm-parser/wasm-loader', () => ({
    initWasm: vi.fn().mockRejectedValue(new Error('WASM asset unavailable')),
    wasm: {}
  }))
  vi.stubGlobal('Worker', FailingWorker)
  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  vi.stubGlobal('location', { hostname: 'localhost' })

  const [{ Parser }, { WasmParser }, { setLogLevel }] = await Promise.all([
    import('../src/parser'),
    import('../src/wasm-parser'),
    import('../src/logger')
  ])
  setLogLevel('none')
  return { Parser, WasmParser }
}

afterEach(() => {
  vi.doUnmock('../src/vite-optimizer-diagnostic')
  vi.doUnmock('../src/wasm-parser/wasm-loader')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('Parser Vite optimizer development integration diagnostic', () => {
  it('deduplicates WASM then Worker failures across Parser instances', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { Parser, WasmParser } = await importParsersInOptimizedModule()

    const wasmParser = new WasmParser()
    await wasmParser.init()
    expect(wasmParser.isWasmSupported()).toBe(false)

    await expect(
      new Parser({ isDisableImageBitmapShim: true }).load(
        'https://example.com/first.svga'
      )
    ).resolves.toMatchObject({ version: expect.anything() })
    await expect(
      new Parser({ isDisableImageBitmapShim: true }).load(
        'https://example.com/second.svga'
      )
    ).resolves.toMatchObject({ version: expect.anything() })

    expect(error).toHaveBeenCalledOnce()
  })

  it('preserves Parser results when Worker then WASM diagnosis output throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console unavailable')
    })
    const { Parser, WasmParser } = await importParsersInOptimizedModule()

    await expect(
      new Parser({ isDisableImageBitmapShim: true }).load(
        'https://example.com/worker-first.svga'
      )
    ).resolves.toMatchObject({ version: expect.anything() })

    const wasmParser = new WasmParser()
    await expect(wasmParser.init()).resolves.toBeUndefined()
    expect(wasmParser.isWasmSupported()).toBe(false)
    expect(error).toHaveBeenCalledOnce()
  })
})
