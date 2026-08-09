import { describe, expect, it } from 'vitest'
import { resolveKeepFrameShapes } from '../src/wasm-parser/keep-shapes'
import type { VideoFrame, VideoFrameShape } from '../src/types'
import type { RawFrame } from '../src/wasm-parser/frame-reader'

const layout = { x: 0, y: 0, width: 64, height: 64 }
const transform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
const shapeA = {
  type: 'Rect',
  x: 0,
  y: 0,
  width: 64,
  height: 64,
  cornerRadius: 0,
  transform,
  styles: {
    fill: 'rgba(255, 255, 255, 1)',
    stroke: null,
    strokeWidth: null,
    lineCap: null,
    lineJoin: null,
    miterLimit: null,
    lineDash: null
  }
} satisfies VideoFrameShape
const shapeB = {
  ...shapeA,
  width: 32,
  height: 32
} satisfies VideoFrameShape

function createRawFrame(shapeType: 'Shape' | 'Keep'): RawFrame {
  return {
    alpha: 1,
    layout,
    transform,
    clip_path: '',
    shapes: [{ type: shapeType }]
  }
}

function createVideoFrame(shapes: VideoFrameShape[]): VideoFrame {
  return {
    alpha: 1,
    transform,
    nx: 0,
    ny: 0,
    layout,
    clipPath: '',
    maskPath: null,
    shapes
  }
}

describe('KEEP frame playback compatibility', () => {
  it('resolves WASM lazy KEEP frames without relying on access order', () => {
    const rawFrames = new Map<number, RawFrame>([
      [0, createRawFrame('Shape')],
      [1, createRawFrame('Keep')],
      [27, createRawFrame('Keep')],
      [28, createRawFrame('Shape')],
      [29, createRawFrame('Keep')]
    ])
    const frameCache: VideoFrame[] = []
    const readRawFrame = (frameIndex: number) => {
      const rawFrame = rawFrames.get(frameIndex)
      if (rawFrame === undefined) return createRawFrame('Keep')
      return rawFrame
    }
    const convertRawFrame = (_rawFrame: RawFrame, frameIndex: number) =>
      createVideoFrame(frameIndex >= 28 ? [shapeB] : [shapeA])

    expect(
      resolveKeepFrameShapes({
        frameIndex: 1,
        frameCache,
        readRawFrame,
        convertRawFrame
      })
    ).toStrictEqual([shapeA])

    expect(
      resolveKeepFrameShapes({
        frameIndex: 27,
        frameCache: [],
        readRawFrame,
        convertRawFrame
      })
    ).toStrictEqual([shapeA])

    const nextGroupCache: VideoFrame[] = []
    expect(
      resolveKeepFrameShapes({
        frameIndex: 29,
        frameCache: nextGroupCache,
        readRawFrame,
        convertRawFrame
      })
    ).toStrictEqual([shapeB])
    expect(nextGroupCache[28].shapes).toStrictEqual([shapeB])
  })
})
