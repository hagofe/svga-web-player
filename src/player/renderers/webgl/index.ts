/**
 * WebGLRenderer - 轻量级包装器
 *
 * 使用 SharedWebGLRenderer 单例进行实际渲染，
 * 避免创建多个 WebGL Context。
 */

import { IRenderer, RendererOptions } from '../shared/types'
import { SharedWebGLRenderer } from './shared-context'

let instanceCounter = 0

export class WebGLRenderer implements IRenderer {
  name = 'webgl' as const

  private _id: string
  private _options: RendererOptions | null = null
  private _sharedRenderer: SharedWebGLRenderer | null = null

  constructor() {
    this._id = `webgl-player-${++instanceCounter}`
  }

  async init(options: RendererOptions): Promise<void> {
    this._options = options

    // SharedWebGLRenderer 只支持 HTMLCanvasElement
    if (!(options.canvas instanceof HTMLCanvasElement)) {
      throw new Error('WebGLRenderer requires HTMLCanvasElement')
    }

    // 获取共享渲染器单例
    this._sharedRenderer = SharedWebGLRenderer.getInstance()

    // 注册到共享渲染器
    this._sharedRenderer.register(
      this._id,
      options.canvas,
      options.videoEntity,
      options.bitmapsCache
    )
  }

  prepare(): void {
    // 共享渲染器会自动处理 viewport
  }

  clear(): void {
    // Clear 由 renderFrame 内部处理
  }

  drawFrame(frameIndex: number): void {
    if (!this._sharedRenderer) return
    this._sharedRenderer.renderFrame(this._id, frameIndex)
  }

  destroy(): void {
    if (this._sharedRenderer) {
      this._sharedRenderer.unregister(this._id)
      this._sharedRenderer = null
    }
    this._options = null
  }
}
