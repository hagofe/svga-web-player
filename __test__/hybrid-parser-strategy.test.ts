import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Video } from '../src/types'

const wasmParser = vi.hoisted(() => ({
  init: vi.fn(),
  isWasmSupported: vi.fn(),
  load: vi.fn()
}))

vi.mock('../src/wasm-parser', () => ({
  getWasmParser: () => wasmParser
}))

import { HybridParser } from '../src/hybrid-parser'

const wasmVideo = createVideo('wasm')
let WorkerMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  wasmParser.init.mockResolvedValue(undefined)
  HybridParser.setGlobalConcurrencyLimit(2)
  WorkerMock = vi.fn()
  vi.stubGlobal('Worker', WorkerMock)
  vi.stubGlobal('location', { hostname: 'localhost' })
})

afterEach(() => {
  HybridParser.setGlobalConcurrencyLimit(2)
  vi.unstubAllGlobals()
})

describe('HybridParser strategy', () => {
  it('uses WASM for the auto strategy when WASM is supported', async () => {
    wasmParser.isWasmSupported.mockReturnValue(true)
    wasmParser.load.mockResolvedValue(wasmVideo)
    const parser = new HybridParser({ parserStrategy: 'auto' })

    await expect(parser.load('https://example.com/auto.svga')).resolves.toBe(
      wasmVideo
    )

    expect(wasmParser.init).toHaveBeenCalledOnce()
    expect(wasmParser.load).toHaveBeenCalledWith(
      'https://example.com/auto.svga'
    )
    expect(WorkerMock).not.toHaveBeenCalled()
  })

  it('does not fall back from strict WASM when WASM is unsupported', async () => {
    wasmParser.isWasmSupported.mockReturnValue(false)
    const parser = new HybridParser({ parserStrategy: 'wasm' })

    await expect(
      parser.load('https://example.com/unsupported.svga')
    ).rejects.toThrow('WASM not supported')

    expect(wasmParser.load).not.toHaveBeenCalled()
    expect(WorkerMock).not.toHaveBeenCalled()
  })

  it('does not fall back from strict WASM when WASM parsing fails', async () => {
    wasmParser.isWasmSupported.mockReturnValue(true)
    wasmParser.load.mockRejectedValue(new Error('WASM parse failed'))
    const parser = new HybridParser({ parserStrategy: 'wasm' })

    await expect(
      parser.load('https://example.com/broken.svga')
    ).rejects.toThrow('WASM parse failed')

    expect(WorkerMock).not.toHaveBeenCalled()
  })
})

function createVideo(version: string): Video {
  return {
    version,
    size: { width: 1, height: 1 },
    fps: 30,
    frames: 1,
    images: {},
    replaceElements: {},
    dynamicElements: {},
    sprites: []
  }
}
