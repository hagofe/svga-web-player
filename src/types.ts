/**
 * Renderer interface for SVGA playback.
 * Implementations: CanvasRenderer, WebGLRenderer, WebGPURenderer
 */
export interface IRenderer {
  name: 'webgpu' | 'webgl' | 'canvas'
  init(options: RendererInitOptions): Promise<void>
  drawFrame(frame: number): void
  prepare(): void
  clear(): void
  destroy(): void
}

/**
 * Options for renderer initialization.
 * Passed internally by Player - users don't need to construct this.
 */
export interface RendererInitOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas
  /**
   * Parser 解析后的 svga 实例，等同播放描述
   */
  videoEntity: Video
  /**
   * 缓存所有图片的 bitmap
   */
  bitmapsCache: BitmapsCache
  /**
   * 动态元素
   */
  dynamicElements: DynamicElements
  /**
   * 替换元素
   */
  replaceElements: ReplaceElements
}

export interface Elements {
  /**
   * 动态元素
   */
  dynamicElements?: DynamicElements
  /**
   * 替换元素
   */
  replaceElements?: ReplaceElements
}

export interface ParserPostMessageArgs {
  url: string
  options: {
    isDisableImageBitmapShim: boolean
    maxImageDecodeConcurrency?: number
  }
}

export interface MockWebWorker {
  onmessage: (event: { data: ParserPostMessageArgs }) => void
  onmessageCallback: (data: Video | Error) => void
  postMessage: (data: Video | Error) => void
}

export interface ParserConfigOptions {
  /**
   * 是否取消使用 WebWorker，默认值 false
   */
  isDisableWebWorker?: boolean
  /**
   * 是否取消使用 ImageBitmap 垫片，默认值 false
   */
  isDisableImageBitmapShim?: boolean
  /**
   * Parser strategy: 'auto' (default), 'wasm', 'js'
   * - auto: Use WASM if supported, fallback to JS
   * - wasm: Force WASM parser only
   * - js: Force JS parser only
   */
  parserStrategy?: ParserStrategy
  /**
   * Maximum concurrent image decode operations.
   * Default: 6. Set to 1 for serial execution.
   */
  maxImageDecodeConcurrency?: number
  /**
   * Maximum concurrent SVGA file parsing operations (global).
   * Default: 2. Limits how many files can be parsed simultaneously.
   */
  globalConcurrencyLimit?: number
}

/**
 * Parser strategy type
 */
export type ParserStrategy = 'auto' | 'wasm' | 'js'

/**
 * Base parser interface.
 * Implementations: JsParser, WasmParser, HybridParser
 */
export interface IParser {
  /** Initialize the parser */
  init(): Promise<void>

  /** Load and parse SVGA from URL */
  load(url: string): Promise<Video>

  /** Destroy and cleanup resources */
  destroy(): void
}

/**
 * WASM-specific parser interface with additional capabilities.
 */
export interface IWasmParser extends IParser {
  /** Parse SVGA from raw ArrayBuffer */
  parseWithWasm(
    data: ArrayBuffer,
    cacheKey: string,
    options?: ParserConfigOptions
  ): Promise<Video | null>

  /** Check if WASM is supported (call after init()) */
  isWasmSupported(): boolean
}

export interface RawImages {
  [key: string]: string | HTMLImageElement | ImageBitmap
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Transform {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

export const enum LINE_CAP_CODE {
  BUTT = 0,
  ROUND = 1,
  SQUARE = 2
}

export const enum LINE_JOIN_CODE {
  MITER = 0,
  ROUND = 1,
  BEVEL = 2
}

export interface RGBA_CODE {
  r: number
  g: number
  b: number
  a: number
}

export type RGBA<
  R extends number,
  G extends number,
  B extends number,
  A extends number
> = `rgba(${R}, ${G}, ${B}, ${A})`

export const enum SHAPE_TYPE_CODE {
  SHAPE = 0,
  RECT = 1,
  ELLIPSE = 2,
  KEEP = 3
}

export const enum SHAPE_TYPE {
  SHAPE = 'shape',
  RECT = 'rect',
  ELLIPSE = 'ellipse'
}

export interface MovieStyles {
  fill: RGBA_CODE | null
  stroke: RGBA_CODE | null
  strokeWidth: number | null
  lineCap: LINE_CAP_CODE | null
  lineJoin: LINE_JOIN_CODE | null
  miterLimit: number | null
  lineDashI: number | null
  lineDashII: number | null
  lineDashIII: number | null
}

export interface VideoStyles {
  fill: RGBA<number, number, number, number> | null
  stroke: RGBA<number, number, number, number> | null
  strokeWidth: number | null
  lineCap: CanvasLineCap | null
  lineJoin: CanvasLineJoin | null
  miterLimit: number | null
  lineDash: number[] | null
}

/**
 * Pre-compiled drawing command for SVG path
 * Format: [opcode, ...numeric_args]
 * Opcodes: M=0, m=1, L=2, l=3, H=4, h=5, V=6, v=7, C=8, c=9, S=10, s=11, Q=12, q=13, Z=14
 */
export type DrawCmd = [op: number, ...args: number[]]

export interface ShapePath {
  d?: string // Original string (optional after compilation)
  commands?: DrawCmd[] // Pre-compiled drawing commands
}

export interface RectPath {
  x: number
  y: number
  width: number
  height: number
  cornerRadius: number
}

export interface EllipsePath {
  x: number
  y: number
  radiusX: number
  radiusY: number
}

export interface MovieShape {
  type: SHAPE_TYPE_CODE | null
  shape: ShapePath | null
  rect: RectPath | null
  ellipse: EllipsePath | null
  styles: MovieStyles | null
  transform: Transform | null
}

export interface VideoShapeShape {
  type: SHAPE_TYPE.SHAPE
  path: ShapePath
  styles: VideoStyles
  transform: Transform
}

export interface VideoShapeRect {
  type: SHAPE_TYPE.RECT
  path: RectPath
  styles: VideoStyles
  transform: Transform
}

export interface VideoShapeEllipse {
  type: SHAPE_TYPE.ELLIPSE
  path: EllipsePath
  styles: VideoStyles
  transform: Transform
}

export interface MaskPath {
  d?: string // Original string (optional after compilation)
  commands?: DrawCmd[] // Pre-compiled drawing commands
  transform: Transform | undefined
  styles: VideoStyles
}

export interface MovieFrame {
  alpha: number
  transform: Transform | null
  nx: number
  ny: number
  layout: Rect
  clipPath: string
  maskPath: MaskPath | null
  shapes: MovieShape[]
}

export type VideoFrameShape =
  | VideoShapeShape
  | VideoShapeRect
  | VideoShapeEllipse

export type VideoFrameShapes = VideoFrameShape[]

export interface VideoFrame {
  alpha: number
  transform: Transform | null
  nx: number
  ny: number
  layout: Rect
  clipPath: string
  maskPath: MaskPath | null
  shapes: VideoFrameShapes
}

export interface MovieSprite {
  imageKey: string
  frames: MovieFrame[]
}

export interface VideoSprite {
  imageKey: string
  frames: VideoFrame[]
}

export type Bitmap = HTMLImageElement | OffscreenCanvas | ImageBitmap

export interface BitmapsCache {
  [key: string]: Bitmap | ImageBitmap
}

export type ReplaceElement =
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas

export interface ReplaceElements {
  [key: string]: ReplaceElement
}

export type DynamicElement =
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas

export interface DynamicElements {
  [key: string]: DynamicElement
}

export interface Movie {
  version: string
  images: {
    [key: string]: Uint8Array
  }
  params: {
    fps: number
    frames: number
    viewBoxHeight: number
    viewBoxWidth: number
  }
  sprites: MovieSprite[]
}

export interface Video {
  version: string
  size: {
    width: number
    height: number
  }
  fps: number
  frames: number
  images: RawImages
  replaceElements: ReplaceElements
  dynamicElements: DynamicElements
  sprites: VideoSprite[]
}

export const enum PLAYER_FILL_MODE {
  /**
   * 播放完成后停在首帧
   */
  FORWARDS = 'forwards',
  /**
   * 播放完成后停在尾帧
   */
  BACKWARDS = 'backwards'
}

export const enum PLAYER_PLAY_MODE {
  /**
   * 顺序播放
   */
  FORWARDS = 'forwards',
  /**
   * 倒序播放
   */
  FALLBACKS = 'fallbacks'
}

export interface PlayerConfig {
  /**
   * 播放动画的 Canvas 元素
   */
  container: HTMLCanvasElement
  /**
   * 循环次数，默认值 0（无限循环）
   */
  loop: number | boolean
  /**
   * 最后停留的目标模式，类似于 animation-fill-mode，默认值 forwards。
   */
  fillMode: PLAYER_FILL_MODE
  /**
   * 播放模式，默认值 forwards
   */
  playMode: PLAYER_PLAY_MODE
  /**
   * 开始播放的帧数，默认值 0
   */
  startFrame: number
  /**
   * 结束播放的帧数，默认值 0
   */
  endFrame: number
  /**
   * 循环播放的开始帧，默认值 0
   */
  loopStartFrame: number
  /**
   * 是否开启缓存已播放过的帧数据，默认值 false
   */
  isCacheFrames: boolean
  /**
   * 是否开启动画容器视窗检测，默认值 false
   * 开启后利用 Intersection Observer API 检测动画容器是否处于视窗内，若处于视窗外，停止描绘渲染帧避免造成资源消耗
   */
  isUseIntersectionObserver: boolean
  /**
   * 是否使用避免执行延迟，默认值 false
   * 开启后使用 `WebWorker` 确保动画按时执行（避免个别情况下浏览器延迟或停止执行动画任务）
   */
  /**
   * Whether to use NoExecutionDelay, default false
   * Use WebWorker to ensure animation executes on time
   */
  isOpenNoExecutionDelay: boolean

  /**
   * Renderer instances to try in order.
   * Example: [new WebGLRenderer(), new CanvasRenderer()]
   * Default: Uses CanvasRenderer only
   */
  renderers?: IRenderer[]
}

export type PlayerConfigOptions = Partial<PlayerConfig>
