/**
 * SharedWebGLRenderer - 全局单例 WebGL 渲染器
 *
 * 所有 Player 实例共享一个 OffscreenCanvas + WebGL Context，
 * 避免超过浏览器的 16 个 context 限制。
 *
 * 工作流程：
 * 1. 每个 Player 注册到 SharedWebGLRenderer
 * 2. 渲染时，先渲染到 OffscreenCanvas
 * 3. 然后 drawImage 到目标 Canvas
 */

import {
  Transform,
  SHAPE_TYPE,
  VideoStyles,
  VideoFrameShape,
  VideoSprite,
  Bitmap,
  ReplaceElement,
  DynamicElement,
  DrawCmd,
  Video
} from '../../../types'
import { DrawOp } from '../../../path-compiler'
import { TextureAtlas } from '../shared/texture-atlas'
import { ShapeRenderer } from './shape-renderer'
import {
  SpriteBatchRenderer,
  SPRITE_VERTEX_SHADER,
  SPRITE_FRAGMENT_SHADER
} from './sprite-batch-renderer'
import { logger } from '../../../logger'

interface CurrentPoint {
  x: number
  y: number
  x1: number
  y1: number
  x2: number
  y2: number
}

// 注册的 Player 实例信息
interface RegisteredPlayer {
  id: string
  targetCanvas: HTMLCanvasElement
  targetCtx: CanvasRenderingContext2D
  videoEntity: Video
  bitmapsCache: Record<string, Bitmap>
  atlas: TextureAtlas | null
  atlasTexture: WebGLTexture | null
}

/**
 * SharedWebGLRenderer - 全局单例
 */
export class SharedWebGLRenderer {
  private static _instance: SharedWebGLRenderer | null = null

  private _offscreenCanvas: OffscreenCanvas
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram
  private _batchRenderer: SpriteBatchRenderer

  private _players: Map<string, RegisteredPlayer> = new Map()

  // Shape rendering
  private _shapeCanvas: OffscreenCanvas
  private _shapeContext: OffscreenCanvasRenderingContext2D
  private _shapeTexture: WebGLTexture
  private _shapeRenderer: ShapeRenderer

  private constructor() {
    // Create offscreen canvas with max expected size
    this._offscreenCanvas = new OffscreenCanvas(1024, 1024)

    const gl = this._offscreenCanvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true // Need this for readback
    })

    if (!gl) {
      throw new Error('WebGL2 not supported')
    }

    this._gl = gl

    gl.enable(gl.BLEND)
    // Use premultiplied alpha blending (matches shader that pre-multiplies color by alpha)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    // Premultiply alpha when uploading textures to match blend mode
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)

    // Compile shaders
    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      SPRITE_VERTEX_SHADER
    )
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      SPRITE_FRAGMENT_SHADER
    )

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile shaders')
    }

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Failed to link program')
    }

    this._program = program
    this._batchRenderer = new SpriteBatchRenderer(gl, program)

    // Shape canvas
    this._shapeCanvas = new OffscreenCanvas(1024, 1024)
    this._shapeContext = this._shapeCanvas.getContext('2d')!
    this._shapeTexture = gl.createTexture()!

    // Set texture parameters once at creation time (not per-frame)
    gl.bindTexture(gl.TEXTURE_2D, this._shapeTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, null)

    // GPU shape renderer
    this._shapeRenderer = new ShapeRenderer(gl)
  }

  static getInstance(): SharedWebGLRenderer {
    if (!SharedWebGLRenderer._instance) {
      SharedWebGLRenderer._instance = new SharedWebGLRenderer()
    }
    return SharedWebGLRenderer._instance
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this._gl
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('Shader compile error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * 注册一个 Player 实例
   */
  register(
    id: string,
    targetCanvas: HTMLCanvasElement,
    videoEntity: Video,
    bitmapsCache: Record<string, Bitmap>
  ): void {
    // 如果已注册，先注销
    if (this._players.has(id)) {
      this.unregister(id)
    }

    const targetCtx = targetCanvas.getContext('2d')!

    // 创建 Atlas 并上传纹理
    const atlas = TextureAtlas.getOrCreate(bitmapsCache)
    const atlasTexture = this._gl.createTexture()!

    this._gl.bindTexture(this._gl.TEXTURE_2D, atlasTexture)
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGBA,
      this._gl.RGBA,
      this._gl.UNSIGNED_BYTE,
      atlas.canvas
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_WRAP_S,
      this._gl.CLAMP_TO_EDGE
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_WRAP_T,
      this._gl.CLAMP_TO_EDGE
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      this._gl.LINEAR
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MAG_FILTER,
      this._gl.LINEAR
    )

    this._players.set(id, {
      id,
      targetCanvas,
      targetCtx,
      videoEntity,
      bitmapsCache,
      atlas,
      atlasTexture
    })
  }

  /**
   * 注销一个 Player
   */
  unregister(id: string): void {
    const player = this._players.get(id)
    if (player) {
      if (player.atlasTexture) {
        this._gl.deleteTexture(player.atlasTexture)
      }
      if (player.atlas) {
        player.atlas.release()
      }
      this._players.delete(id)
    }
  }

  // Pending shapes for batched drawing at end of frame
  private _pendingShapes: Array<{
    shapes: VideoFrameShape[]
    parentTransform: Transform
    alpha: number
  }> = []

  /**
   * 在绘制位图之前刷新所有待处理的 shapes
   * 保证正确的 z-order：上一个 sprite 的 shapes 必须在下一个 sprite 的 bitmap 之前绘制
   */
  private flushPendingShapes(atlasTexture: WebGLTexture): void {
    if (this._pendingShapes.length === 0) return
    this._batchRenderer.flush()
    this.drawAllShapesBatched(atlasTexture)
    this._pendingShapes = []
  }

  /**
   * 渲染一帧到目标 Canvas
   */
  renderFrame(id: string, frameIndex: number): void {
    const player = this._players.get(id)
    if (!player) return

    const {
      targetCanvas,
      targetCtx,
      videoEntity,
      bitmapsCache,
      atlas,
      atlasTexture
    } = player
    const { width, height } = targetCanvas

    // Resize offscreen if needed
    if (
      this._offscreenCanvas.width !== width ||
      this._offscreenCanvas.height !== height
    ) {
      this._offscreenCanvas.width = width
      this._offscreenCanvas.height = height
      this._shapeCanvas.width = width
      this._shapeCanvas.height = height
    }

    const gl = this._gl

    // Setup viewport
    gl.viewport(0, 0, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Bind atlas texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture)

    // Start batch
    this._batchRenderer.begin(width, height)

    // Draw all sprites
    for (const sprite of videoEntity.sprites) {
      const bitmap = bitmapsCache[sprite.imageKey]
      const replaceElement = videoEntity.replaceElements[sprite.imageKey]
      const dynamicElement = videoEntity.dynamicElements[sprite.imageKey]

      this.drawSprite(
        sprite,
        frameIndex,
        bitmap,
        replaceElement,
        dynamicElement,
        atlas!,
        atlasTexture!
      )
    }

    // Draw all collected shapes in one batch at end of frame
    this.flushPendingShapes(atlasTexture!)

    // End batch
    this._batchRenderer.end()

    // Copy to target canvas
    // Use transferToImageBitmap if available (faster), fallback to drawImage for older browsers
    targetCtx.clearRect(0, 0, width, height)
    if (typeof this._offscreenCanvas.transferToImageBitmap === 'function') {
      const bitmap = this._offscreenCanvas.transferToImageBitmap()
      targetCtx.drawImage(bitmap, 0, 0)
      bitmap.close() // Release memory immediately
    } else {
      targetCtx.drawImage(this._offscreenCanvas, 0, 0)
    }
  }

  private drawSprite(
    sprite: VideoSprite,
    currentFrame: number,
    bitmap: Bitmap | undefined,
    replaceElement: ReplaceElement | undefined,
    dynamicElement: DynamicElement | undefined,
    atlas: TextureAtlas,
    atlasTexture: WebGLTexture
  ): void {
    const frame = sprite.frames[currentFrame]
    if (frame.alpha < 0.05) return

    const transform = frame.transform ?? {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: 0,
      ty: 0
    }

    // Draw bitmap from atlas
    // 在绘制 bitmap 之前，先绘制所有待处理的 shapes（保证 z-order）
    if (bitmap !== undefined && !replaceElement) {
      this.flushPendingShapes(atlasTexture)
      const region = atlas.getRegion(sprite.imageKey)

      if (region) {
        if (frame.maskPath !== null) {
          this._batchRenderer.flush()
          this.drawMaskedBitmap(
            bitmap,
            frame.layout.width,
            frame.layout.height,
            transform,
            frame.alpha,
            frame.maskPath.commands,
            frame.maskPath.transform,
            frame.maskPath.styles,
            atlasTexture
          )
        } else {
          this._batchRenderer.draw(
            frame.layout.width,
            frame.layout.height,
            transform,
            frame.alpha,
            region.u0,
            region.v0,
            region.u1,
            region.v1
          )
        }
      }
    } else if (replaceElement) {
      this.flushPendingShapes(atlasTexture)
      this._batchRenderer.flush()
      this.drawNonAtlasImage(
        replaceElement,
        frame.layout.width,
        frame.layout.height,
        transform,
        frame.alpha,
        atlasTexture
      )
    }

    // Dynamic element
    if (dynamicElement !== undefined) {
      this.flushPendingShapes(atlasTexture)
      this._batchRenderer.flush()
      const dx = (frame.layout.width - dynamicElement.width) / 2
      const dy = (frame.layout.height - dynamicElement.height) / 2
      const combinedTransform: Transform = {
        a: transform.a,
        b: transform.b,
        c: transform.c,
        d: transform.d,
        tx: transform.tx + dx * transform.a + dy * transform.c,
        ty: transform.ty + dx * transform.b + dy * transform.d
      }
      this.drawNonAtlasImage(
        dynamicElement,
        dynamicElement.width,
        dynamicElement.height,
        combinedTransform,
        frame.alpha,
        atlasTexture
      )
    }

    // Shapes - collect for batched drawing at end of frame
    if (frame.shapes.length > 0) {
      this._pendingShapes.push({
        shapes: frame.shapes,
        parentTransform: transform,
        alpha: frame.alpha
      })
    }
  }

  private drawNonAtlasImage(
    image: Bitmap | ReplaceElement | DynamicElement,
    width: number,
    height: number,
    transform: Transform,
    alpha: number,
    atlasTexture: WebGLTexture
  ): void {
    const gl = this._gl

    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    this._batchRenderer.draw(width, height, transform, alpha, 0, 0, 1, 1)
    this._batchRenderer.flush()

    gl.bindTexture(gl.TEXTURE_2D, atlasTexture)
    gl.deleteTexture(texture)
  }

  private drawMaskedBitmap(
    image: Bitmap | ReplaceElement,
    width: number,
    height: number,
    transform: Transform,
    alpha: number,
    maskCommands: DrawCmd[] | undefined,
    maskTransform: Transform | undefined,
    maskStyles: VideoStyles,
    atlasTexture: WebGLTexture
  ): void {
    const ctx = this._shapeContext
    const cw = this._shapeCanvas.width
    const ch = this._shapeCanvas.height

    ctx.clearRect(0, 0, cw, ch)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx,
      transform.ty
    )

    if (maskCommands) {
      this.drawBezierPath(ctx, maskCommands, maskTransform, maskStyles)
      ctx.clip()
    }

    ctx.drawImage(image, 0, 0, width, height)
    ctx.restore()

    this.uploadShapeCanvasAndDraw(atlasTexture)
  }

  /**
   * 批量绘制所有收集的 shapes
   * 优先使用 GPU ShapeRenderer，失败时使用 Canvas 2D fallback
   */
  private drawAllShapesBatched(atlasTexture: WebGLTexture): void {
    if (this._pendingShapes.length === 0) return

    const cw = this._shapeCanvas.width
    const ch = this._shapeCanvas.height

    // Collect shapes that need Canvas 2D fallback
    const fallbackShapes: Array<{
      shape: VideoFrameShape
      parentTransform: Transform
      alpha: number
    }> = []

    // Try GPU rendering for each shape
    for (const pending of this._pendingShapes) {
      for (const shape of pending.shapes) {
        // Try GPU rendering first
        const gpuSuccess = this._shapeRenderer.draw(
          shape,
          pending.parentTransform,
          pending.alpha,
          cw,
          ch
        )

        // If GPU fails (e.g., stroke-only shape), queue for Canvas fallback
        if (!gpuSuccess) {
          fallbackShapes.push({
            shape,
            parentTransform: pending.parentTransform,
            alpha: pending.alpha
          })
        }
      }
    }

    // Re-bind sprite batch state after shape rendering (program, buffer, vertex attributes)
    this._batchRenderer.rebindState()

    // If there are fallback shapes, use Canvas 2D
    if (fallbackShapes.length > 0) {
      const ctx = this._shapeContext
      ctx.clearRect(0, 0, cw, ch)

      for (const item of fallbackShapes) {
        ctx.save()
        ctx.globalAlpha = item.alpha
        ctx.transform(
          item.parentTransform.a,
          item.parentTransform.b,
          item.parentTransform.c,
          item.parentTransform.d,
          item.parentTransform.tx,
          item.parentTransform.ty
        )
        this.drawShape(ctx, item.shape)
        ctx.restore()
      }

      this.uploadShapeCanvasAndDraw(atlasTexture)
    }
  }

  private drawShape(
    ctx: OffscreenCanvasRenderingContext2D,
    shape: VideoFrameShape
  ): void {
    switch (shape.type) {
      case SHAPE_TYPE.SHAPE:
        this.drawBezierPath(
          ctx,
          shape.path.commands,
          shape.transform,
          shape.styles
        )
        break
      case SHAPE_TYPE.ELLIPSE:
        this.drawEllipse(
          ctx,
          shape.path.x ?? 0,
          shape.path.y ?? 0,
          shape.path.radiusX ?? 0,
          shape.path.radiusY ?? 0,
          shape.transform,
          shape.styles
        )
        break
      case SHAPE_TYPE.RECT:
        this.drawRect(
          ctx,
          shape.path.x ?? 0,
          shape.path.y ?? 0,
          shape.path.width ?? 0,
          shape.path.height ?? 0,
          shape.path.cornerRadius ?? 0,
          shape.transform,
          shape.styles
        )
        break
    }
  }

  private resetShapeStyles(
    ctx: OffscreenCanvasRenderingContext2D,
    styles: VideoStyles | undefined
  ): void {
    if (!styles) return
    ctx.strokeStyle = styles.stroke ?? 'transparent'
    ctx.fillStyle = styles.fill ?? 'transparent'
    if (styles.strokeWidth !== null && styles.strokeWidth > 0)
      ctx.lineWidth = styles.strokeWidth
    if (styles.miterLimit !== null && styles.miterLimit > 0)
      ctx.miterLimit = styles.miterLimit
    if (styles.lineCap !== null) ctx.lineCap = styles.lineCap
    if (styles.lineJoin !== null) ctx.lineJoin = styles.lineJoin
    if (styles.lineDash !== null) ctx.setLineDash(styles.lineDash)
  }

  private drawBezierPath(
    ctx: OffscreenCanvasRenderingContext2D,
    commands: DrawCmd[] | undefined,
    transform: Transform | undefined,
    styles: VideoStyles
  ): void {
    ctx.save()
    this.resetShapeStyles(ctx, styles)

    if (transform) {
      ctx.transform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.tx,
        transform.ty
      )
    }

    const cp: CurrentPoint = { x: 0, y: 0, x1: 0, y1: 0, x2: 0, y2: 0 }
    ctx.beginPath()

    if (commands) {
      for (const cmd of commands) {
        this.executeDrawCmd(ctx, cp, cmd)
      }
    }

    if (styles.fill !== null) ctx.fill()
    if (styles.stroke !== null) ctx.stroke()
    ctx.restore()
  }

  private executeDrawCmd(
    ctx: OffscreenCanvasRenderingContext2D,
    cp: CurrentPoint,
    cmd: DrawCmd
  ): void {
    const [op, ...args] = cmd

    switch (op) {
      case DrawOp.M:
        cp.x = args[0]
        cp.y = args[1]
        ctx.moveTo(cp.x, cp.y)
        break
      case DrawOp.m:
        cp.x += args[0]
        cp.y += args[1]
        ctx.moveTo(cp.x, cp.y)
        break
      case DrawOp.L:
        cp.x = args[0]
        cp.y = args[1]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.l:
        cp.x += args[0]
        cp.y += args[1]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.H:
        cp.x = args[0]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.h:
        cp.x += args[0]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.V:
        cp.y = args[0]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.v:
        cp.y += args[0]
        ctx.lineTo(cp.x, cp.y)
        break
      case DrawOp.C:
        cp.x1 = args[0]
        cp.y1 = args[1]
        cp.x2 = args[2]
        cp.y2 = args[3]
        cp.x = args[4]
        cp.y = args[5]
        ctx.bezierCurveTo(cp.x1, cp.y1, cp.x2, cp.y2, cp.x, cp.y)
        break
      case DrawOp.c:
        cp.x1 = cp.x + args[0]
        cp.y1 = cp.y + args[1]
        cp.x2 = cp.x + args[2]
        cp.y2 = cp.y + args[3]
        cp.x += args[4]
        cp.y += args[5]
        ctx.bezierCurveTo(cp.x1, cp.y1, cp.x2, cp.y2, cp.x, cp.y)
        break
      case DrawOp.Q:
        cp.x1 = args[0]
        cp.y1 = args[1]
        cp.x = args[2]
        cp.y = args[3]
        ctx.quadraticCurveTo(cp.x1, cp.y1, cp.x, cp.y)
        break
      case DrawOp.q:
        cp.x1 = cp.x + args[0]
        cp.y1 = cp.y + args[1]
        cp.x += args[2]
        cp.y += args[3]
        ctx.quadraticCurveTo(cp.x1, cp.y1, cp.x, cp.y)
        break
      case DrawOp.Z:
        ctx.closePath()
        break
    }
  }

  private drawEllipse(
    ctx: OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    transform: Transform | undefined,
    styles: VideoStyles
  ): void {
    ctx.save()
    this.resetShapeStyles(ctx, styles)
    if (transform)
      ctx.transform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.tx,
        transform.ty
      )

    const ex = x - radiusX,
      ey = y - radiusY,
      w = radiusX * 2,
      h = radiusY * 2
    const kappa = 0.5522848,
      ox = (w / 2) * kappa,
      oy = (h / 2) * kappa
    const xe = ex + w,
      ye = ey + h,
      xm = ex + w / 2,
      ym = ey + h / 2

    ctx.beginPath()
    ctx.moveTo(ex, ym)
    ctx.bezierCurveTo(ex, ym - oy, xm - ox, ey, xm, ey)
    ctx.bezierCurveTo(xm + ox, ey, xe, ym - oy, xe, ym)
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye)
    ctx.bezierCurveTo(xm - ox, ye, ex, ym + oy, ex, ym)

    if (styles.fill !== null) ctx.fill()
    if (styles.stroke !== null) ctx.stroke()
    ctx.restore()
  }

  private drawRect(
    ctx: OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    cornerRadius: number,
    transform: Transform | undefined,
    styles: VideoStyles
  ): void {
    ctx.save()
    this.resetShapeStyles(ctx, styles)
    if (transform)
      ctx.transform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.tx,
        transform.ty
      )

    let r = cornerRadius
    if (width < 2 * r) r = width / 2
    if (height < 2 * r) r = height / 2

    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + width, y, x + width, y + height, r)
    ctx.arcTo(x + width, y + height, x, y + height, r)
    ctx.arcTo(x, y + height, x, y, r)
    ctx.arcTo(x, y, x + width, y, r)
    ctx.closePath()

    if (styles.fill !== null) ctx.fill()
    if (styles.stroke !== null) ctx.stroke()
    ctx.restore()
  }

  private uploadShapeCanvasAndDraw(atlasTexture: WebGLTexture): void {
    const gl = this._gl
    const canvas = this._shapeCanvas

    // Texture parameters are set once at creation time in constructor
    gl.bindTexture(gl.TEXTURE_2D, this._shapeTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)

    this._batchRenderer.draw(
      canvas.width,
      canvas.height,
      { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
      1.0,
      0,
      0,
      1,
      1
    )
    this._batchRenderer.flush()

    gl.bindTexture(gl.TEXTURE_2D, atlasTexture)
  }

  /**
   * 销毁整个共享渲染器
   */
  destroy(): void {
    for (const [id] of this._players) {
      this.unregister(id)
    }
    this._batchRenderer.destroy()
    this._shapeRenderer.destroy()
    this._gl.deleteTexture(this._shapeTexture)
    this._gl.deleteProgram(this._program)
    SharedWebGLRenderer._instance = null
  }
}
