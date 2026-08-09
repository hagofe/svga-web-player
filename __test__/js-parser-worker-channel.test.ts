import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Video } from '../src/types'

vi.mock('../src/wasm-parser', () => ({
  getWasmParser: () => {
    throw new Error('WASM parser must not be used by JS Worker channel tests')
  }
}))

let JsParser: typeof import('../src/parser').Parser
let HybridParser: typeof import('../src/hybrid-parser').HybridParser
let setLogLevel: typeof import('../src/logger').setLogLevel

type WorkerRequest = {
  requestId: number
  url: string
  options: {
    isDisableImageBitmapShim: boolean
    maxImageDecodeConcurrency?: number
  }
}

type WorkerResponse =
  | { requestId: number; ok: true; video: Video }
  | {
      requestId: number
      ok: false
      failureKind: 'parse' | 'channel'
      error: string
    }

const videos = {
  first: createVideo('first'),
  second: createVideo('second'),
  afterRestart: createVideo('after-restart')
}

const fixtureBuffer = readFileSync(
  new URL('./svga/kaola.svga', import.meta.url)
)
const imageFixtureBuffer = readFileSync(
  new URL('./svga/dragon.svga', import.meta.url)
)

class FakeXMLHttpRequest {
  static requestCount = 0
  static delayResponses = false
  static pendingResponses: FakeXMLHttpRequest[] = []
  static responseBuffer = fixtureBuffer

  public response: ArrayBuffer | undefined
  public responseType: XMLHttpRequestResponseType = ''
  public status = 200
  public statusText = 'OK'
  public onloadend: ((event: ProgressEvent) => void) | null = null

  open(): void {}

  send(): void {
    FakeXMLHttpRequest.requestCount += 1
    if (FakeXMLHttpRequest.delayResponses) {
      FakeXMLHttpRequest.pendingResponses.push(this)
      return
    }
    this.respond()
  }

  respond(): void {
    const buffer = FakeXMLHttpRequest.responseBuffer
    this.response = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    this.onloadend?.({} as ProgressEvent)
  }

  static flushResponses(): void {
    const pendingResponses = this.pendingResponses.splice(0)
    pendingResponses.forEach((request) => request.respond())
  }
}

class FakeWorker {
  static instances: FakeWorker[] = []
  static constructionAttempts = 0
  static constructionError: Error | undefined

  public onmessage: ((event: MessageEvent<unknown>) => void) | null = null
  public onerror: OnErrorEventHandler = null
  public onmessageerror: ((event: MessageEvent) => void) | null = null
  public readonly requests: WorkerRequest[] = []
  public readonly terminate = vi.fn()
  public postMessageError: Error | undefined

  constructor(
    public readonly url: string | URL,
    public readonly options?: WorkerOptions
  ) {
    FakeWorker.constructionAttempts += 1
    if (FakeWorker.constructionError) throw FakeWorker.constructionError
    FakeWorker.instances.push(this)
  }

  postMessage(request: WorkerRequest): void {
    if (this.postMessageError) throw this.postMessageError
    this.requests.push(request)
  }

  respondWithVideo(requestIndex: number, video: Video): void {
    const request = this.requests[requestIndex]
    this.onmessage?.({
      data: { requestId: request.requestId, ok: true, video }
    } as MessageEvent<WorkerResponse>)
  }

  respondWithParseError(requestIndex: number, error: string): void {
    const request = this.requests[requestIndex]
    this.onmessage?.({
      data: {
        requestId: request.requestId,
        ok: false,
        failureKind: 'parse',
        error
      }
    } as MessageEvent<WorkerResponse>)
  }

  respondWithChannelError(requestIndex: number, error: string): void {
    const request = this.requests[requestIndex]
    this.onmessage?.({
      data: {
        requestId: request.requestId,
        ok: false,
        failureKind: 'channel',
        error
      }
    } as MessageEvent<WorkerResponse>)
  }

  respondWithRaw(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent<unknown>)
  }

  failScript(error: Error): void {
    this.onerror?.({ error, message: error.message } as ErrorEvent)
  }

  failMessage(error: Error): void {
    this.onmessageerror?.({ data: error } as MessageEvent)
  }
}

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

beforeEach(async () => {
  vi.resetModules()
  FakeWorker.instances = []
  FakeWorker.constructionAttempts = 0
  FakeWorker.constructionError = undefined
  FakeXMLHttpRequest.requestCount = 0
  FakeXMLHttpRequest.delayResponses = false
  FakeXMLHttpRequest.pendingResponses = []
  FakeXMLHttpRequest.responseBuffer = fixtureBuffer
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  vi.stubGlobal('location', { hostname: 'localhost' })

  ;[{ Parser: JsParser }, { HybridParser }, { setLogLevel }] =
    await Promise.all([
      import('../src/parser'),
      import('../src/hybrid-parser'),
      import('../src/logger')
    ])
  setLogLevel('none')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('JsParser Worker channel', () => {
  it('reuses the lazy Worker for sequential loads', async () => {
    const parser = new JsParser()

    const firstLoad = parser.load('https://example.com/first.svga')
    const worker = FakeWorker.instances[0]
    worker.respondWithVideo(0, videos.first)
    await expect(firstLoad).resolves.toBe(videos.first)

    const secondLoad = parser.load('https://example.com/second.svga')
    worker.respondWithVideo(1, videos.second)

    expect(FakeWorker.instances).toHaveLength(1)
    await expect(secondLoad).resolves.toBe(videos.second)
  })

  it('forwards image decode concurrency to the Worker channel', async () => {
    const parser = new JsParser({ maxImageDecodeConcurrency: 1 })
    const load = parser.load('https://example.com/worker.svga')
    const worker = FakeWorker.instances[0]

    expect(worker.requests[0].options.maxImageDecodeConcurrency).toBe(1)
    worker.respondWithVideo(0, videos.first)
    await expect(load).resolves.toBe(videos.first)
  })

  it('creates one Worker lazily and associates concurrent responses by request', async () => {
    const parser = new JsParser()

    expect(FakeWorker.instances).toHaveLength(0)

    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')
    const worker = FakeWorker.instances[0]

    expect(FakeWorker.instances).toHaveLength(1)
    expect(worker.requests).toHaveLength(2)

    worker.respondWithVideo(1, videos.second)
    worker.respondWithVideo(0, videos.first)

    await expect(firstLoad).resolves.toBe(videos.first)
    await expect(secondLoad).resolves.toBe(videos.second)
  })

  it('rejects only the request whose Worker parse failed', async () => {
    const parser = new JsParser()
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/broken.svga')
    const worker = FakeWorker.instances[0]

    worker.respondWithParseError(1, 'invalid svga data')
    worker.respondWithVideo(0, videos.first)

    await expect(firstLoad).resolves.toBe(videos.first)
    await expect(secondLoad).rejects.toThrow('invalid svga data')
    expect(FakeXMLHttpRequest.requestCount).toBe(0)
  })

  it('cancels pending requests on destroy and starts a fresh Worker on the next load', async () => {
    const parser = new JsParser()
    const pendingLoad = parser.load('https://example.com/pending.svga')
    const firstWorker = FakeWorker.instances[0]

    parser.destroy()

    await expect(pendingLoad).rejects.toMatchObject({ name: 'AbortError' })
    expect(firstWorker.terminate).toHaveBeenCalledOnce()
    expect(FakeXMLHttpRequest.requestCount).toBe(0)

    const nextLoad = parser.load('https://example.com/after-restart.svga')
    const secondWorker = FakeWorker.instances[1]

    expect(secondWorker).not.toBe(firstWorker)
    secondWorker.respondWithVideo(0, videos.afterRestart)
    await expect(nextLoad).resolves.toBe(videos.afterRestart)
  })

  it('does not start main-thread fallback when destroyed after a Worker error in the same turn', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const pendingLoad = parser.load('https://example.com/pending.svga')
    const worker = FakeWorker.instances[0]

    worker.failScript(new Error('Worker script failed'))
    parser.destroy()

    await expect(pendingLoad).rejects.toMatchObject({ name: 'AbortError' })
    expect(FakeXMLHttpRequest.requestCount).toBe(0)
  })

  it('cancels concurrent main-thread fallbacks and starts a fresh session', async () => {
    FakeXMLHttpRequest.delayResponses = true
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')
    const worker = FakeWorker.instances[0]
    const outcomes = ['pending', 'pending']
    void firstLoad.then(
      () => {
        outcomes[0] = 'resolved'
      },
      (error: Error) => {
        outcomes[0] = error.name
      }
    )
    void secondLoad.then(
      () => {
        outcomes[1] = 'resolved'
      },
      (error: Error) => {
        outcomes[1] = error.name
      }
    )

    worker.failScript(new Error('Worker script failed'))
    await vi.waitFor(() => expect(FakeXMLHttpRequest.requestCount).toBe(2))

    parser.destroy()
    parser.destroy()
    try {
      await vi.waitFor(() =>
        expect(outcomes).toEqual(['AbortError', 'AbortError'])
      )
    } finally {
      FakeXMLHttpRequest.pendingResponses[1].status = 500
      FakeXMLHttpRequest.pendingResponses[1].statusText = 'Server Error'
      FakeXMLHttpRequest.delayResponses = false
      FakeXMLHttpRequest.flushResponses()
      await Promise.allSettled([firstLoad, secondLoad])
    }
    expect(outcomes).toEqual(['AbortError', 'AbortError'])

    await expect(
      parser.load('https://example.com/after-restart.svga')
    ).resolves.toMatchObject({ version: expect.anything() })
    expect(FakeXMLHttpRequest.requestCount).toBe(3)
  })

  it('falls back to the main-thread JS core when Worker construction fails', async () => {
    FakeWorker.constructionError = new Error('Worker construction blocked')
    const parser = new JsParser({ isDisableImageBitmapShim: true })

    const video = await parser.load('https://example.com/fixture.svga')

    expect(video.version).toBeTruthy()
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it('preserves image decode concurrency in the main-thread fallback', async () => {
    FakeWorker.constructionError = new Error('Worker construction blocked')
    FakeXMLHttpRequest.responseBuffer = imageFixtureBuffer
    let activeDecodes = 0
    let maxActiveDecodes = 0
    const createImageBitmap = vi.fn(async () => {
      activeDecodes += 1
      maxActiveDecodes = Math.max(maxActiveDecodes, activeDecodes)
      await new Promise((resolve) => setTimeout(resolve, 1))
      activeDecodes -= 1
      return {} as ImageBitmap
    })
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const parser = new JsParser({ maxImageDecodeConcurrency: 1 })

    await expect(
      parser.load('https://example.com/fixture.svga')
    ).resolves.toMatchObject({ version: expect.anything() })

    expect(createImageBitmap.mock.calls.length).toBeGreaterThan(1)
    expect(maxActiveDecodes).toBe(1)
  })

  it('keeps main-thread fallback inside the global parse limit', async () => {
    FakeXMLHttpRequest.delayResponses = true
    const parser = new HybridParser({
      parserStrategy: 'js',
      globalConcurrencyLimit: 1,
      isDisableImageBitmapShim: true
    })
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')

    try {
      await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(1))
      const worker = FakeWorker.instances[0]
      expect(worker.requests).toHaveLength(1)
      worker.failScript(new Error('Worker script failed'))
      await vi.waitFor(() => expect(FakeXMLHttpRequest.requestCount).toBe(1))
      expect(FakeXMLHttpRequest.pendingResponses).toHaveLength(1)

      FakeXMLHttpRequest.pendingResponses.shift()!.respond()
      await firstLoad
      await vi.waitFor(() => expect(FakeXMLHttpRequest.requestCount).toBe(2))
      expect(FakeWorker.constructionAttempts).toBe(1)
      expect(FakeXMLHttpRequest.pendingResponses).toHaveLength(1)

      FakeXMLHttpRequest.pendingResponses.shift()!.respond()
      await secondLoad
    } finally {
      FakeXMLHttpRequest.delayResponses = false
      parser.destroy()
      FakeXMLHttpRequest.flushResponses()
      await Promise.allSettled([firstLoad, secondLoad])
    }
  })

  it('falls back all pending requests when the Worker script fails', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')

    FakeWorker.instances[0].failScript(new Error('Worker script failed'))

    await expect(firstLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    await expect(secondLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(FakeXMLHttpRequest.requestCount).toBe(2)
  })

  it('falls back only the affected request when postMessage throws', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const workerLoad = parser.load('https://example.com/worker.svga')
    const worker = FakeWorker.instances[0]
    worker.respondWithVideo(0, videos.first)
    await expect(workerLoad).resolves.toBe(videos.first)

    worker.postMessageError = new Error('DataCloneError')
    const fallbackLoad = parser.load('https://example.com/fallback.svga')

    await expect(fallbackLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(worker.terminate).not.toHaveBeenCalled()
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it('falls back only the affected request when the Worker cannot serialize its response', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const fallbackLoad = parser.load('https://example.com/fallback.svga')
    const worker = FakeWorker.instances[0]

    worker.respondWithChannelError(0, 'DataCloneError')

    await expect(fallbackLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(worker.terminate).not.toHaveBeenCalled()
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it('rebuilds the channel and falls back all pending requests after messageerror', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')
    const firstWorker = FakeWorker.instances[0]

    firstWorker.failMessage(new Error('Response could not be deserialized'))

    await expect(firstLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    await expect(secondLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(firstWorker.terminate).toHaveBeenCalledOnce()

    const nextLoad = parser.load('https://example.com/next.svga')
    const secondWorker = FakeWorker.instances[1]
    secondWorker.respondWithVideo(0, videos.afterRestart)
    await expect(nextLoad).resolves.toBe(videos.afterRestart)
  })

  it('falls back all pending and rebuilds after a legacy Worker response without a request id', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const firstLoad = parser.load('https://example.com/first.svga')
    const secondLoad = parser.load('https://example.com/second.svga')
    const firstWorker = FakeWorker.instances[0]

    firstWorker.respondWithRaw(videos.first)

    expect(firstWorker.terminate).toHaveBeenCalledOnce()
    await expect(firstLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    await expect(secondLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(FakeXMLHttpRequest.requestCount).toBe(2)

    const nextLoad = parser.load('https://example.com/after-restart.svga')
    const secondWorker = FakeWorker.instances[1]
    secondWorker.respondWithVideo(0, videos.afterRestart)

    expect(FakeWorker.constructionAttempts).toBe(2)
    await expect(nextLoad).resolves.toBe(videos.afterRestart)
  })

  it('falls back pending requests after the current Worker returns an unknown request id', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const pendingLoad = parser.load('https://example.com/pending.svga')
    const worker = FakeWorker.instances[0]

    worker.respondWithRaw({
      requestId: 999,
      ok: true,
      video: videos.first
    })

    expect(worker.terminate).toHaveBeenCalledOnce()
    await expect(pendingLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it.each<[string, (requestId: number) => unknown]>([
    [
      'success response without video',
      (requestId) => ({ requestId, ok: true })
    ],
    [
      'failure response without error',
      (requestId) => ({ requestId, ok: false, failureKind: 'parse' })
    ],
    [
      'response with an invalid status',
      (requestId) => ({ requestId, ok: 'yes', video: videos.first })
    ]
  ])('falls back after a malformed Worker %s', async (_name, responseFor) => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const pendingLoad = parser.load('https://example.com/pending.svga')
    const worker = FakeWorker.instances[0]

    worker.respondWithRaw(responseFor(worker.requests[0].requestId))

    expect(worker.terminate).toHaveBeenCalledOnce()
    await expect(pendingLoad).resolves.toMatchObject({
      version: expect.anything()
    })
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it('ignores a delayed malformed response from a released Worker', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const cancelledLoad = parser.load('https://example.com/cancelled.svga')
    const firstWorker = FakeWorker.instances[0]
    const delayedOnMessage = firstWorker.onmessage

    parser.destroy()
    await expect(cancelledLoad).rejects.toMatchObject({ name: 'AbortError' })

    const nextLoad = parser.load('https://example.com/next.svga')
    const secondWorker = FakeWorker.instances[1]
    delayedOnMessage?.({ data: videos.first } as MessageEvent<unknown>)

    expect(secondWorker.terminate).not.toHaveBeenCalled()
    expect(FakeXMLHttpRequest.requestCount).toBe(0)
    secondWorker.respondWithVideo(0, videos.afterRestart)
    await expect(nextLoad).resolves.toBe(videos.afterRestart)
  })

  it('uses the same fallback for parserStrategy js and preserves explicit main-thread mode', async () => {
    FakeWorker.constructionError = new Error('Worker construction blocked')
    const hybridParser = new HybridParser({
      parserStrategy: 'js',
      isDisableImageBitmapShim: true
    })

    await expect(
      hybridParser.load('https://example.com/hybrid.svga')
    ).resolves.toMatchObject({ version: expect.anything() })

    FakeWorker.constructionError = undefined
    const mainThreadParser = new JsParser({
      isDisableWebWorker: true,
      isDisableImageBitmapShim: true
    })
    await expect(
      mainThreadParser.load('https://example.com/main.svga')
    ).resolves.toMatchObject({ version: expect.anything() })
    expect(FakeWorker.instances).toHaveLength(0)
  })

  it('circuit-breaks a Worker URL after construction failure and deduplicates its warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    setLogLevel('debug')
    FakeWorker.constructionError = new Error('Worker construction blocked')

    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/first.svga'
    )

    FakeWorker.constructionError = undefined
    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/second.svga'
    )

    expect(FakeWorker.constructionAttempts).toBe(1)
    expect(FakeXMLHttpRequest.requestCount).toBe(2)
    expect(warn).toHaveBeenCalledOnce()
    expect(debug).toHaveBeenCalledOnce()
  })

  it('circuit-breaks a Worker URL after script execution failure', async () => {
    const firstLoad = new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/first.svga'
    )
    FakeWorker.instances[0].failScript(new Error('Worker script failed'))
    await firstLoad

    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/second.svga'
    )

    expect(FakeWorker.constructionAttempts).toBe(1)
    expect(FakeXMLHttpRequest.requestCount).toBe(2)
  })

  it('records an idle Worker script failure even when no request is pending', async () => {
    const parser = new JsParser({ isDisableImageBitmapShim: true })
    const workerLoad = parser.load('https://example.com/worker.svga')
    const worker = FakeWorker.instances[0]
    worker.respondWithVideo(0, videos.first)
    await workerLoad

    worker.failScript(new Error('Late Worker script failure'))
    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/fallback.svga'
    )

    expect(FakeWorker.constructionAttempts).toBe(1)
    expect(FakeXMLHttpRequest.requestCount).toBe(1)
  })

  it('isolates the circuit breaker by Worker URL', async () => {
    FakeWorker.constructionError = new Error('Worker construction blocked')
    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/first.svga'
    )

    FakeWorker.constructionError = undefined
    vi.stubGlobal('location', { hostname: 'other-host.example' })
    const secondLoad = new JsParser().load('https://example.com/second.svga')
    FakeWorker.instances[0].respondWithVideo(0, videos.second)

    await expect(secondLoad).resolves.toBe(videos.second)
    expect(FakeWorker.constructionAttempts).toBe(2)
  })

  it('warns once for each distinct failing Worker URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLogLevel('debug')
    FakeWorker.constructionError = new Error('Worker construction blocked')

    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/first.svga'
    )
    vi.stubGlobal('location', { hostname: 'other-host.example' })
    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/second.svga'
    )

    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('does not circuit-break after a postMessage failure', async () => {
    const firstParser = new JsParser({ isDisableImageBitmapShim: true })
    const workerLoad = firstParser.load('https://example.com/worker.svga')
    const firstWorker = FakeWorker.instances[0]
    firstWorker.respondWithVideo(0, videos.first)
    await workerLoad

    firstWorker.postMessageError = new Error('DataCloneError')
    await firstParser.load('https://example.com/fallback.svga')

    const secondLoad = new JsParser().load('https://example.com/second.svga')
    const secondWorker = FakeWorker.instances[1]
    secondWorker.respondWithVideo(0, videos.second)

    await expect(secondLoad).resolves.toBe(videos.second)
    expect(FakeWorker.constructionAttempts).toBe(2)
  })

  it('does not circuit-break after messageerror', async () => {
    const firstParser = new JsParser({ isDisableImageBitmapShim: true })
    const firstLoad = firstParser.load('https://example.com/first.svga')
    FakeWorker.instances[0].failMessage(
      new Error('Response could not be deserialized')
    )
    await firstLoad

    const secondLoad = new JsParser().load('https://example.com/second.svga')
    FakeWorker.instances[1].respondWithVideo(0, videos.second)

    await expect(secondLoad).resolves.toBe(videos.second)
    expect(FakeWorker.constructionAttempts).toBe(2)
  })

  it('does not circuit-break or warn after a Worker parse failure or explicit main-thread use', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLogLevel('debug')
    const workerParser = new JsParser()
    const failedLoad = workerParser.load('https://example.com/broken.svga')
    FakeWorker.instances[0].respondWithParseError(0, 'invalid svga data')
    await expect(failedLoad).rejects.toThrow('invalid svga data')

    const nextLoad = new JsParser().load('https://example.com/next.svga')
    FakeWorker.instances[1].respondWithVideo(0, videos.second)
    await expect(nextLoad).resolves.toBe(videos.second)

    await new JsParser({
      isDisableWebWorker: true,
      isDisableImageBitmapShim: true
    }).load('https://example.com/main.svga')

    expect(FakeWorker.constructionAttempts).toBe(2)
    expect(warn).not.toHaveBeenCalled()
  })

  it('retries the Worker after a fresh module state', async () => {
    FakeWorker.constructionError = new Error('Worker construction blocked')
    await new JsParser({ isDisableImageBitmapShim: true }).load(
      'https://example.com/first.svga'
    )

    FakeWorker.constructionError = undefined
    vi.resetModules()
    const { Parser: FreshJsParser } = await import('../src/parser')
    const freshLoad = new FreshJsParser().load('https://example.com/fresh.svga')
    FakeWorker.instances[0].respondWithVideo(0, videos.afterRestart)

    await expect(freshLoad).resolves.toBe(videos.afterRestart)
    expect(FakeWorker.constructionAttempts).toBe(2)
  })
})
