/**
 * WASM SVGA Parser Integration (Lazy Parsing)
 *
 * This module provides a hybrid loader that uses the Rust/WASM parser
 * with a Lazy Loading architecture for maximum performance.
 */

import type {
  Video,
  RawImages,
  VideoSprite,
  VideoFrame,
  ReplaceElements,
  DynamicElements,
  VideoFrameShape,
  VideoStyles,
  ParserConfigOptions,
  IWasmParser
} from '../types'
import { compilePath } from '../path-compiler'
import {
  WasmMemoryReader,
  type RawFrame,
  type RawShape,
  type RawShapeStyle
} from './frame-reader'
import {
  forEachWithConcurrency,
  DEFAULT_IMAGE_DECODE_CONCURRENCY
} from '../utils/concurrency'
import { initWasm, wasm as wasmBindings } from './wasm-loader'
import { logger } from '../logger'
import { resolveKeepFrameShapes } from './keep-shapes'
import { reportViteOptimizerIntegrationDiagnostic } from '../vite-optimizer-diagnostic'

function uint8ArrayToString(u8a: Uint8Array): string {
  let dataString = ''
  for (let i = 0; i < u8a.length; i++) {
    dataString += String.fromCharCode(u8a[i])
  }
  return dataString
}

// WASM module types (from pkg/svga_wasm.d.ts)
interface SvgaDocument {
  free(): void
  version: string
  width: number
  height: number
  fps: number
  frames: number
  sprite_count: number
  get_images(): any // { key: Uint8Array }
  get_sprite_image_key(index: number): string | undefined
  get_sprite_frame_count(index: number): number
  get_frame(spriteIndex: number, frameIndex: number): WasmFrame
  get_frame_ptr(spriteIndex: number, frameIndex: number): number // True Raw Transfer
}

interface WasmModule {
  // Bundler target exports init as named export (auto-called on import)
  init: () => void
  SvgaDocument: new (data: Uint8Array) => SvgaDocument
  // Raw Transfer memory access
  wasm_memory: () => WebAssembly.Memory
  raw_frame_size: () => number
  raw_shape_size: () => number
  raw_style_size: () => number
  get_frames_ptr: () => number
  get_shapes_ptr: () => number
  get_styles_ptr: () => number
  get_strings_ptr: () => number
  get_floats_ptr: () => number
  clear_frame_arena: () => void
}

interface WasmFrame {
  alpha: number
  layout: { x: number; y: number; width: number; height: number }
  transform: {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
  }
  clip_path: string // Raw SVG path string
  shapes: WasmShape[]
}

interface WasmShape {
  type: 'Shape' | 'Rect' | 'Ellipse' | 'Keep'
  d?: string // Raw SVG path string
  x?: number
  y?: number
  width?: number
  height?: number
  corner_radius?: number
  radius_x?: number
  radius_y?: number
  styles?: WasmShapeStyle
  transform?: {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
  }
}

interface WasmShapeStyle {
  fill?: { r: number; g: number; b: number; a: number }
  stroke?: { r: number; g: number; b: number; a: number }
  stroke_width?: number
  line_cap?: number
  line_join?: number
  miter_limit?: number
  line_dash?: number[]
}

class LazyVideo implements Video {
  public version: string
  public size: { width: number; height: number }
  public fps: number
  public frames: number
  public images: RawImages
  public replaceElements: ReplaceElements = {}
  public dynamicElements: DynamicElements = {}
  public sprites: VideoSprite[]

  private _doc: SvgaDocument // Keep reference to avoid GC
  private _memoryReader: WasmMemoryReader
  private _wasmModule: WasmModule

  constructor(
    doc: SvgaDocument,
    images: RawImages,
    memoryReader: WasmMemoryReader,
    wasmModule: WasmModule
  ) {
    this._doc = doc
    this._memoryReader = memoryReader
    this._wasmModule = wasmModule
    this.version = doc.version
    this.size = {
      width: doc.width,
      height: doc.height
    }
    this.fps = doc.fps
    this.frames = doc.frames
    this.images = images

    // Create Lazy Sprites
    this.sprites = Array.from({ length: doc.sprite_count }, (_, i) =>
      this.createLazySprite(i)
    )
  }

  private createLazySprite(index: number): VideoSprite {
    const imageKey = this._doc.get_sprite_image_key(index) || ''
    const frameCount = this._doc.get_sprite_frame_count(index)

    // Create Proxy for frames array
    // This is the core magic: we pretend to be an array, but fetch on demand
    const framesProxy = new Proxy(Array.from({ length: frameCount }), {
      get: (target, prop, receiver) => {
        // If accessing an index
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const frameIndex = Number(prop)
          if (frameIndex >= 0 && frameIndex < frameCount) {
            // Check if already cached (optional, but good for performance)
            if (target[frameIndex]) {
              return target[frameIndex]
            }

            const converted = this.createFrameFromWasm(
              index,
              frameIndex,
              target as VideoFrame[]
            )

            // Cache it
            target[frameIndex] = converted
            return converted
          }
        }
        return Reflect.get(target, prop, receiver)
      }
    })

    return {
      imageKey,
      frames: framesProxy as any as VideoFrame[]
    }
  }

  // --- Conversion Logic (Same as before, adapted for Lazy) ---

  private readRawFrame(spriteIndex: number, frameIndex: number): RawFrame {
    // Fetch from WASM using True Raw Transfer (Zero-Copy)
    const frameIdx = this._doc.get_frame_ptr(spriteIndex, frameIndex)

    // Update memory pointers (arena may have grown)
    this._memoryReader.updatePointers(
      this._wasmModule.get_frames_ptr(),
      this._wasmModule.get_shapes_ptr(),
      this._wasmModule.get_styles_ptr(),
      this._wasmModule.get_strings_ptr(),
      this._wasmModule.get_floats_ptr()
    )

    return this._memoryReader.readFrame(frameIdx)
  }

  private createFrameFromWasm(
    spriteIndex: number,
    frameIndex: number,
    frameCache: VideoFrame[]
  ): VideoFrame {
    const rawFrame = this.readRawFrame(spriteIndex, frameIndex)
    return this.convertFrameFromRaw(
      rawFrame,
      spriteIndex,
      frameIndex,
      frameCache
    )
  }

  private convertFrameFromRaw(
    frame: RawFrame,
    spriteIndex: number,
    frameIndex: number,
    frameCache: VideoFrame[]
  ): VideoFrame {
    const transform = frame.transform || {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 0,
      ty: 0
    }
    const layout = frame.layout || { x: 0, y: 0, width: 0, height: 0 }

    // Calculate nx, ny
    const { a, b, c, d, tx, ty } = transform
    const { x, y, width, height } = layout

    const llx = a * x + c * y + tx
    const lrx = a * (x + width) + c * y + tx
    const lbx = a * x + c * (y + height) + tx
    const rbx = a * (x + width) + c * (y + height) + tx

    const lly = b * x + d * y + ty
    const lry = b * (x + width) + d * y + ty
    const lby = b * x + d * (y + height) + ty
    const rby = b * (x + width) + d * (y + height) + ty

    const nx = Math.min(Math.min(lbx, rbx), Math.min(llx, lrx))
    const ny = Math.min(Math.min(lby, rby), Math.min(lly, lry))

    // Refined maskPath construction without any cast
    let finalMaskPath = null
    if (frame.clip_path && frame.clip_path.length > 0) {
      const parsedCommands = compilePath(frame.clip_path)
      finalMaskPath = {
        commands: parsedCommands.map((cmd) => [cmd[0], ...cmd.slice(1)]),
        transform: undefined,
        styles: {
          fill: 'rgba(0, 0, 0, 0)',
          stroke: null,
          strokeWidth: null,
          lineCap: null,
          lineJoin: null,
          miterLimit: null,
          lineDash: null
        }
      }
    }

    // Handle KEEP shape type: if first shape is KEEP, reuse previous frame's shapes
    // This matches the JS parser behavior in video-entity.ts
    let shapes: VideoFrameShape[]
    const firstShape = frame.shapes[0]
    if (firstShape && firstShape.type === 'Keep') {
      shapes = this.resolveKeepShapes(spriteIndex, frameIndex, frameCache)
    } else {
      // Convert normal shapes; the lazy frame array caches the full frame.
      shapes = frame.shapes
        .map((s) => this.convertShape(s))
        .filter((s): s is VideoFrameShape => s !== null)
    }

    return {
      alpha: frame.alpha,
      layout,
      transform,
      clipPath: '',
      shapes,
      nx,
      ny,
      maskPath: finalMaskPath as any
    }
  }

  private resolveKeepShapes(
    spriteIndex: number,
    frameIndex: number,
    frameCache: VideoFrame[]
  ): VideoFrameShape[] {
    return resolveKeepFrameShapes({
      frameIndex,
      frameCache,
      readRawFrame: (previousIndex) =>
        this.readRawFrame(spriteIndex, previousIndex),
      convertRawFrame: (rawFrame, previousIndex) =>
        this.convertFrameFromRaw(
          rawFrame,
          spriteIndex,
          previousIndex,
          frameCache
        )
    })
  }

  private convertShape(shape: RawShape): VideoFrameShape | null {
    const transform = shape.transform || {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 0,
      ty: 0
    }
    const styles = this.convertStyles(shape.styles)

    switch (shape.type) {
      case 'Shape':
        const parsedCommands = shape.d ? compilePath(shape.d) : []
        const commands = parsedCommands.map((cmd) => [cmd[0], ...cmd.slice(1)])
        return {
          type: 'shape' as any, // SHAPE_TYPE.SHAPE enum string value check needed?
          // Checking types.ts: export const enum SHAPE_TYPE { SHAPE = 'shape' ... }
          path: { commands },
          styles,
          transform
        } as any
      case 'Rect':
        return {
          type: 'rect' as any,
          path: {
            x: shape.x || 0,
            y: shape.y || 0,
            width: shape.width || 0,
            height: shape.height || 0,
            cornerRadius: shape.corner_radius || 0
          },
          styles,
          transform
        } as any
      case 'Ellipse':
        return {
          type: 'ellipse' as any,
          path: {
            x: shape.x || 0,
            y: shape.y || 0,
            radiusX: shape.radius_x || 0,
            radiusY: shape.radius_y || 0
          },
          styles,
          transform
        } as any
      default:
        return null
    }
  }

  private convertStyles(styles?: RawShapeStyle): VideoStyles {
    if (!styles) {
      return {
        fill: null,
        stroke: null,
        strokeWidth: null,
        lineCap: null,
        lineJoin: null,
        miterLimit: null,
        lineDash: null
      }
    }
    const toRgba = (c?: { r: number; g: number; b: number; a: number }) =>
      c
        ? (`rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(
            c.b * 255
          )}, ${c.a})` as any)
        : null

    const caps: CanvasLineCap[] = ['butt', 'round', 'square']
    const joins: CanvasLineJoin[] = ['miter', 'round', 'bevel']

    return {
      fill: toRgba(styles.fill),
      stroke: toRgba(styles.stroke),
      strokeWidth: styles.stroke_width || null,
      lineCap:
        styles.line_cap !== undefined
          ? (caps[styles.line_cap] as CanvasLineCap)
          : null,
      lineJoin:
        styles.line_join !== undefined
          ? (joins[styles.line_join] as CanvasLineJoin)
          : null,
      miterLimit: styles.miter_limit || null,
      lineDash: styles.line_dash || null
    }
  }
  public destroy() {
    this._doc.free()
  }
}

/**
 * SVGA Parser using WASM for high performance
 */
export class WasmParser implements IWasmParser {
  private wasmModule: WasmModule | null = null
  private wasmSupported: boolean | null = null
  private initPromise: Promise<void> | null = null
  private options: ParserConfigOptions = {}

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._init()
    return this.initPromise
  }

  private async _init(): Promise<void> {
    try {
      if (typeof WebAssembly === 'undefined') {
        logger.warn('WebAssembly not supported, using JS fallback')
        this.wasmSupported = false
        return
      }

      // Initialize WASM with proper URL handling
      await initWasm()
      this.wasmModule = wasmBindings as unknown as WasmModule
      this.wasmSupported = true
    } catch (error) {
      reportViteOptimizerIntegrationDiagnostic(import.meta.url)
      logger.warn('Failed to initialize WASM:', error)
      this.wasmSupported = false
    }
  }

  isWasmSupported(): boolean {
    return this.wasmSupported === true
  }

  /**
   * Load and parse SVGA from URL
   */
  async load(url: string): Promise<Video> {
    await this.init()
    if (!this.isWasmSupported()) {
      throw new Error('[WasmParser] WASM not supported')
    }
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    const video = await this.parseWithWasm(data, url, this.options)
    if (!video) {
      throw new Error('[WasmParser] Failed to parse SVGA')
    }
    return video
  }

  async parseWithWasm(
    data: ArrayBuffer,
    _cacheKey: string,
    options: ParserConfigOptions = {}
  ): Promise<Video | null> {
    if (!this.wasmModule || !this.wasmSupported) return null

    try {
      const uint8Data = new Uint8Array(data)

      // 1. Create Document (Lazy Handle) - Fast!
      const doc = new this.wasmModule.SvgaDocument(uint8Data)

      // 2. Create Memory Reader for True Raw Transfer
      const memory = this.wasmModule.wasm_memory()
      const memoryReader = new WasmMemoryReader(
        memory,
        this.wasmModule.raw_frame_size(),
        this.wasmModule.raw_shape_size(),
        this.wasmModule.raw_style_size()
      )

      // 3. Decode Images with concurrency limit
      const rawImages = doc.get_images()
      const images: RawImages = {}

      const imageKeys = Object.keys(rawImages)
      const concurrency =
        options.maxImageDecodeConcurrency ?? DEFAULT_IMAGE_DECODE_CONCURRENCY
      const createBitmap = globalThis.createImageBitmap

      await forEachWithConcurrency(
        imageKeys,
        async (key) => {
          const imageData = rawImages[key]
          if (
            !options.isDisableImageBitmapShim &&
            typeof createBitmap === 'function'
          ) {
            try {
              const blob = new Blob([imageData])
              const bitmap = await createBitmap(blob)
              images[key] = bitmap
              return
            } catch (_e) {
              logger.warn(`Failed to create bitmap for ${key}`)
            }
          }

          const value = uint8ArrayToString(imageData)
          images[key] = btoa(value)
        },
        concurrency
      )

      // 4. Return Lazy Video with Memory Reader
      return new LazyVideo(doc, images, memoryReader, this.wasmModule)
    } catch (error) {
      logger.error('Parse error:', error)
      return null
    }
  }

  /**
   * Destroy parser and free resources
   */
  destroy(): void {
    this.wasmModule = null
    this.wasmSupported = null
    this.initPromise = null
  }
}

let wasmParserInstance: WasmParser | null = null

/**
 * Get the singleton WasmParser instance (lazy initialization)
 */
export function getWasmParser(): WasmParser {
  if (!wasmParserInstance) {
    wasmParserInstance = new WasmParser()
  }
  return wasmParserInstance
}
