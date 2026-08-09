import { Movie, RawImages, Video } from '../types'
import { unzlibSync } from 'fflate'
import { com } from './svga.pb.js'
import { VideoEntity } from './video-entity'
import { Utils } from '../utils'
import {
  forEachWithConcurrency,
  DEFAULT_IMAGE_DECODE_CONCURRENCY
} from '../utils/concurrency'

function uint8ArrayToString(u8a: Uint8Array): string {
  let dataString = ''
  for (let i = 0; i < u8a.length; i++) {
    dataString += String.fromCharCode(u8a[i])
  }
  return dataString
}

// Static proto decoder - no runtime parsing needed
const MovieEntity = com.opensource.svga.MovieEntity

async function download(url: string): Promise<ArrayBuffer> {
  return await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = 'arraybuffer'
    request.onloadend = () => {
      if (
        request.response !== undefined &&
        (request.status === 200 || request.status === 304)
      ) {
        resolve(request.response)
      } else {
        reject(new Error(`XMLHttpRequest, ${request.statusText}`))
      }
    }
    request.send()
  })
}

export interface ParserCoreOptions {
  isDisableImageBitmapShim: boolean
  maxImageDecodeConcurrency?: number
}

/**
 * 统一的解析实现：给定 URL 和选项，返回解析后的 Video
 * 被 Worker 入口和非 Worker 模式共同复用
 */
export async function parseWithCore(
  url: string,
  options: ParserCoreOptions
): Promise<Video> {
  const buffer = await download(url)
  const dataHeader = new Uint8Array(buffer, 0, 4)
  if (Utils.getVersion(dataHeader) !== 2)
    throw new Error('this parser only support version@2 of SVGA.')
  const inflateData = unzlibSync(new Uint8Array(buffer))
  const movie = MovieEntity.decode(inflateData) as unknown as Movie
  const images: RawImages = {}

  const imageKeys = Object.keys(movie.images).filter(
    (key) => !key.startsWith('audio')
  )
  const concurrency =
    options.maxImageDecodeConcurrency ?? DEFAULT_IMAGE_DECODE_CONCURRENCY

  await forEachWithConcurrency(
    imageKeys,
    async (key) => {
      const image = movie.images[key]
      const createBitmap = globalThis.createImageBitmap
      if (
        !options.isDisableImageBitmapShim &&
        typeof createBitmap === 'function'
      ) {
        images[key] = await createBitmap(new Blob([image as BlobPart]))
      } else {
        const value = uint8ArrayToString(image)
        images[key] = btoa(value)
      }
    },
    concurrency
  )

  return new VideoEntity(movie, images)
}
