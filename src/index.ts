// base
export { HybridParser as Parser, parser } from './hybrid-parser'
export { Parser as JsParser } from './parser'
export { Player } from './player'

// renderers (import only what you need for tree shaking)
export { CanvasRenderer } from './player/renderers/canvas'
export { WebGLRenderer } from './player/renderers/webgl'
export { WebGPURenderer } from './player/renderers/webgpu'

// optimization (Phase 1)
export { assetManager, AssetManager } from './asset-manager'
export { compilePath, DrawOp } from './path-compiler'
export type { DrawCmd, CompiledPath } from './path-compiler'

// optimization (Phase 2 - WASM)
export { getWasmParser, WasmParser } from './wasm-parser'

// extension
export { DB } from './db'

// 常用枚举
export { PLAYER_FILL_MODE, PLAYER_PLAY_MODE } from './types'

// types
export type {
  ParserStrategy,
  ParserConfigOptions,
  IParser,
  IWasmParser,
  Video,
  IRenderer,
  RendererInitOptions,
  PlayerConfigOptions,
  PlayerConfig,
  DynamicElement,
  DynamicElements,
  ReplaceElement,
  ReplaceElements,
  VideoSprite,
  VideoFrame,
  Rect,
  Transform
} from './types'

// logger
export { setLogLevel } from './logger'
export type { LogLevel } from './logger'
