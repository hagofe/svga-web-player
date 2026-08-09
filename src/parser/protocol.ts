import type { Video } from '../types'

export interface ParserWorkerRequest {
  requestId: number
  url: string
  options: {
    isDisableImageBitmapShim: boolean
    maxImageDecodeConcurrency?: number
  }
}

export type ParserWorkerResponse =
  | {
      requestId: number
      ok: true
      video: Video
    }
  | {
      requestId: number
      ok: false
      failureKind: 'parse' | 'channel'
      error: string
    }
