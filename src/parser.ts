import { Video, ParserConfigOptions, IParser } from './types'
import { parseWithCore } from './parser/core'
import { logger } from './logger'
import { reportViteOptimizerIntegrationDiagnostic } from './vite-optimizer-diagnostic'
import type {
  ParserWorkerRequest,
  ParserWorkerResponse
} from './parser/protocol'

interface PendingRequest {
  resolve: (video: Video) => void
  reject: (error: Error) => void
  workerUrl: string
}

// These sets deliberately live at module scope: all Parser instances on the
// current page share the result, while a page refresh starts with a clean state.
const unavailableWorkerUrls = new Set<string>()
const loggedWorkerFallbackUrls = new Set<string>()

type WorkerChannelFailureKind =
  | 'construction'
  | 'execution'
  | 'post-message'
  | 'message'

class WorkerChannelError extends Error {
  constructor(
    message: string,
    public readonly kind: WorkerChannelFailureKind,
    public readonly workerUrl: string
  ) {
    super(message)
    this.name = 'WorkerChannelError'
  }
}

function logWorkerFallback(workerUrl: string, reason: string): void {
  const message = `Parser Worker unavailable at ${workerUrl}; falling back to main-thread JS: ${reason}`
  if (loggedWorkerFallbackUrls.has(workerUrl)) {
    logger.debug(message)
    return
  }

  loggedWorkerFallbackUrls.add(workerUrl)
  logger.warn(message)
}

function recordWorkerChannelFailure(error: WorkerChannelError): void {
  reportViteOptimizerIntegrationDiagnostic(import.meta.url)
  if (error.kind === 'construction' || error.kind === 'execution') {
    unavailableWorkerUrls.add(error.workerUrl)
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function hasWorkerRequestId(
  response: unknown
): response is { requestId: number } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'requestId' in response &&
    typeof response.requestId === 'number'
  )
}

function isParserWorkerResponse(
  response: unknown
): response is ParserWorkerResponse {
  if (!hasWorkerRequestId(response) || !('ok' in response)) return false
  if (typeof response.ok !== 'boolean') return false

  if (response.ok) {
    return (
      'video' in response &&
      typeof response.video === 'object' &&
      response.video !== null
    )
  }

  return (
    'failureKind' in response &&
    (response.failureKind === 'parse' || response.failureKind === 'channel') &&
    'error' in response &&
    typeof response.error === 'string'
  )
}

function createCancellationError(): Error {
  const error = new Error('Parser request cancelled by destroy()')
  error.name = 'AbortError'
  return error
}

/**
 * SVGA 下载解析器 (JS implementation)
 */
export class Parser implements IParser {
  public worker: Worker | undefined
  private readonly isDisableImageBitmapShim: boolean = false
  private readonly maxImageDecodeConcurrency: number | undefined
  private readonly useWorker: boolean
  private readonly pendingRequests = new Map<number, PendingRequest>()
  private nextRequestId = 0
  // destroy() advances the generation so promise continuations already queued
  // by a Worker event cannot start or publish work for an obsolete session.
  private sessionGeneration = 0
  private readonly pendingMainThreadFallbackCancellations = new Set<
    (error: Error) => void
  >()

  constructor(
    options: ParserConfigOptions = {
      isDisableWebWorker: false,
      isDisableImageBitmapShim: false
    }
  ) {
    const {
      isDisableWebWorker,
      isDisableImageBitmapShim,
      maxImageDecodeConcurrency
    } = options
    if (isDisableImageBitmapShim === true) {
      this.isDisableImageBitmapShim = isDisableImageBitmapShim
    }
    this.maxImageDecodeConcurrency = maxImageDecodeConcurrency

    this.useWorker = isDisableWebWorker !== true
  }

  /**
   * Initialize parser (no-op for JS parser, included for interface compatibility)
   */
  async init(): Promise<void> {
    // JS Parser doesn't need async initialization
  }

  /**
   * 通过 url 下载并解析 SVGA 文件
   * @param url SVGA 文件的下载链接
   * @returns Promise<SVGA 数据源>
   */
  async load(url: string): Promise<Video> {
    if (url === undefined) throw new Error('url undefined')
    if (url.indexOf('http') !== 0) {
      const a = document.createElement('a')
      a.href = url
      url = a.href
    }

    const { isDisableImageBitmapShim, maxImageDecodeConcurrency } = this

    // 非 Worker 模式：直接调用核心解析逻辑
    if (!this.useWorker) {
      return await parseWithCore(url, {
        isDisableImageBitmapShim,
        maxImageDecodeConcurrency
      })
    }

    const request: ParserWorkerRequest = {
      requestId: ++this.nextRequestId,
      url,
      options: { isDisableImageBitmapShim, maxImageDecodeConcurrency }
    }
    const workerUrl = this.resolveWorkerUrl()
    const sessionGeneration = this.sessionGeneration

    if (!this.worker && unavailableWorkerUrls.has(workerUrl.href)) {
      logWorkerFallback(workerUrl.href, 'previous Worker failure')
      return await this.loadWithMainThread(request, sessionGeneration)
    }

    try {
      const video = await this.loadWithWorker(request, workerUrl)
      this.throwIfSessionCancelled(sessionGeneration)
      return video
    } catch (error) {
      // A Worker parse response is a plain Error and must not repeat the same
      // download/decode work. Only failures in the execution channel recover
      // through the shared main-thread JS core.
      if (!(error instanceof WorkerChannelError)) throw error
      recordWorkerChannelFailure(error)
      this.throwIfSessionCancelled(sessionGeneration)
      logWorkerFallback(error.workerUrl, error.message)
      return await this.loadWithMainThread(request, sessionGeneration)
    }
  }

  private async loadWithMainThread(
    request: ParserWorkerRequest,
    sessionGeneration: number
  ): Promise<Video> {
    this.throwIfSessionCancelled(sessionGeneration)
    // parseWithCore has no cancellation API. Racing it against the current
    // session lets destroy() settle callers immediately while the attached
    // handlers safely ignore a late parse result or error.
    let cancel!: (error: Error) => void
    const cancellation = new Promise<never>((_resolve, reject) => {
      cancel = (error) => reject(error)
    })
    this.pendingMainThreadFallbackCancellations.add(cancel)
    try {
      const video = await Promise.race([
        parseWithCore(request.url, request.options),
        cancellation
      ])
      this.throwIfSessionCancelled(sessionGeneration)
      return video
    } finally {
      this.pendingMainThreadFallbackCancellations.delete(cancel)
    }
  }

  private throwIfSessionCancelled(sessionGeneration: number): void {
    if (sessionGeneration !== this.sessionGeneration) {
      throw createCancellationError()
    }
  }

  private resolveWorkerUrl(): URL {
    // Dev: Vite handles .ts directly. Production uses the bundled classic Worker.
    const workerPath = import.meta.env.DEV
      ? './parser/index.ts'
      : './parser-worker.iife.js'
    const workerUrl = new URL(workerPath, import.meta.url)
    workerUrl.hostname = location.hostname
    return workerUrl
  }

  private createWorker(workerUrl: URL): Worker {
    let worker: Worker
    try {
      worker = new Worker(
        workerUrl,
        import.meta.env.DEV ? { type: 'module' } : undefined
      )
    } catch (error) {
      throw new WorkerChannelError(
        `Failed to construct parser Worker: ${toError(error).message}`,
        'construction',
        workerUrl.href
      )
    }

    worker.onmessage = (event: MessageEvent<unknown>) => {
      this.handleWorkerResponse(worker, workerUrl.href, event.data)
    }
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.()
      this.failWorkerChannel(
        worker,
        new WorkerChannelError(
          `Parser Worker execution failed: ${event.message || 'unknown error'}`,
          'execution',
          workerUrl.href
        )
      )
    }
    worker.onmessageerror = () => {
      this.failWorkerChannel(
        worker,
        new WorkerChannelError(
          'Parser Worker response could not be deserialized',
          'message',
          workerUrl.href
        )
      )
    }
    this.worker = worker
    return worker
  }

  private loadWithWorker(
    request: ParserWorkerRequest,
    workerUrl: URL
  ): Promise<Video> {
    const worker = this.worker ?? this.createWorker(workerUrl)

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.requestId, {
        resolve,
        reject,
        workerUrl: workerUrl.href
      })
      try {
        worker.postMessage(request)
      } catch (error) {
        this.pendingRequests.delete(request.requestId)
        reject(
          new WorkerChannelError(
            `Failed to send request to parser Worker: ${toError(error).message}`,
            'post-message',
            workerUrl.href
          )
        )
      }
    })
  }

  private handleWorkerResponse(
    worker: Worker,
    workerUrl: string,
    response: unknown
  ): void {
    if (!hasWorkerRequestId(response)) {
      this.failWorkerChannel(
        worker,
        new WorkerChannelError(
          'Parser Worker response is missing a requestId',
          'message',
          workerUrl
        )
      )
      return
    }

    if (!isParserWorkerResponse(response)) {
      this.failWorkerChannel(
        worker,
        new WorkerChannelError(
          'Parser Worker response has an invalid shape',
          'message',
          workerUrl
        )
      )
      return
    }

    const pendingRequest = this.pendingRequests.get(response.requestId)
    if (!pendingRequest) {
      this.failWorkerChannel(
        worker,
        new WorkerChannelError(
          `Parser Worker response has an unknown requestId: ${response.requestId}`,
          'message',
          workerUrl
        )
      )
      return
    }

    this.pendingRequests.delete(response.requestId)
    if (response.ok) {
      pendingRequest.resolve(response.video)
      return
    }
    if (response.failureKind === 'channel') {
      pendingRequest.reject(
        new WorkerChannelError(
          response.error,
          'post-message',
          pendingRequest.workerUrl
        )
      )
      return
    }
    pendingRequest.reject(new Error(response.error))
  }

  private failWorkerChannel(worker: Worker, error: WorkerChannelError): void {
    if (this.worker !== worker) return

    // Record script execution failures here rather than only in a pending
    // request's catch path: a reused Worker may fail while it is idle.
    recordWorkerChannelFailure(error)
    this.releaseWorker(worker)
    for (const { reject } of this.pendingRequests.values()) reject(error)
    this.pendingRequests.clear()
  }

  private releaseWorker(worker: Worker): void {
    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null
    worker.terminate()
    if (this.worker === worker) this.worker = undefined
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.sessionGeneration += 1
    if (this.worker) this.releaseWorker(this.worker)

    const cancellationError = createCancellationError()
    for (const cancel of this.pendingMainThreadFallbackCancellations) {
      cancel(cancellationError)
    }
    this.pendingMainThreadFallbackCancellations.clear()
    for (const { reject } of this.pendingRequests.values()) {
      reject(cancellationError)
    }
    this.pendingRequests.clear()
  }
}
