import { parseWithCore } from './core'
import type { ParserWorkerRequest, ParserWorkerResponse } from './protocol'
import type { Video } from '../types'

let worker: Worker

async function onmessage(event: { data: ParserWorkerRequest }): Promise<void> {
  const { requestId, url, options } = event.data
  let video: Video
  try {
    video = await parseWithCore(url, options)
  } catch (error) {
    let errorMessage: string = (error as any).toString()
    if (error instanceof Error) errorMessage = error.message
    const response: ParserWorkerResponse = {
      requestId,
      ok: false,
      failureKind: 'parse',
      error: `[SVGA Parser Error] ${errorMessage}`
    }
    worker.postMessage(response)
    return
  }

  const response: ParserWorkerResponse = { requestId, ok: true, video }
  // Keep structured-clone failures outside the parse catch above. The main
  // thread can recover this request, while a real resource error must not be
  // parsed twice by the same JS core.
  try {
    worker.postMessage(response)
  } catch (error) {
    let errorMessage: string = (error as any).toString()
    if (error instanceof Error) errorMessage = error.message
    const channelFailure: ParserWorkerResponse = {
      requestId,
      ok: false,
      failureKind: 'channel',
      error: `[SVGA Parser Channel Error] ${errorMessage}`
    }
    worker.postMessage(channelFailure)
  }
}

// 作为 Worker 入口脚本使用
worker = self as unknown as Worker
worker.onmessage = onmessage
