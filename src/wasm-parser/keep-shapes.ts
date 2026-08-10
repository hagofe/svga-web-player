import type { VideoFrame, VideoFrameShape } from '../types'
import type { RawFrame } from './frame-reader'

interface ResolveKeepFrameShapesOptions {
  frameIndex: number
  frameCache: VideoFrame[]
  readRawFrame: (frameIndex: number) => RawFrame
  convertRawFrame: (rawFrame: RawFrame, frameIndex: number) => VideoFrame
}

export function resolveKeepFrameShapes({
  frameIndex,
  frameCache,
  readRawFrame,
  convertRawFrame
}: ResolveKeepFrameShapesOptions): VideoFrameShape[] {
  for (
    let previousIndex = frameIndex - 1;
    previousIndex >= 0;
    previousIndex--
  ) {
    const cachedFrame = frameCache[previousIndex]
    if (cachedFrame !== undefined) {
      return cachedFrame.shapes
    }

    const rawFrame = readRawFrame(previousIndex)
    const firstShape = rawFrame.shapes[0]

    if (firstShape === undefined || firstShape.type !== 'Keep') {
      const frame = convertRawFrame(rawFrame, previousIndex)
      frameCache[previousIndex] = frame

      return frame.shapes
    }
  }

  return []
}
