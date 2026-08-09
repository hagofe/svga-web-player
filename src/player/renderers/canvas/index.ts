import {
  DynamicElement,
  Transform,
  SHAPE_TYPE,
  VideoStyles,
  VideoFrameShape,
  VideoSprite,
  Bitmap,
  ReplaceElement,
  DrawCmd
} from '../../../types'
import { DrawOp } from '../../../path-compiler'
import { IRenderer, RendererOptions } from '../shared/types'

interface CurrentPoint {
  x: number
  y: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export class CanvasRenderer implements IRenderer {
  name = 'canvas' as const
  private _options: RendererOptions | null = null
  private _ofsCanvas: HTMLCanvasElement | OffscreenCanvas | null = null
  private _context:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null = null

  async init(options: RendererOptions): Promise<void> {
    this._options = options
    // Initialize offscreen canvas for double buffering
    const { width, height } = options.canvas

    if (typeof window !== 'undefined' && 'OffscreenCanvas' in window) {
      // Firefox issue check
      if (navigator.userAgent.includes('Firefox')) {
        this._ofsCanvas = new window.OffscreenCanvas(width, height)
      } else {
        this._ofsCanvas = new window.OffscreenCanvas(width, height)
      }
    } else {
      this._ofsCanvas = document.createElement('canvas')
      this._ofsCanvas.width = width
      this._ofsCanvas.height = height
    }

    this._context = this._ofsCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
    if (!this._context) {
      throw new Error('Render Context cannot be null')
    }
  }

  prepare(): void {
    if (!this._options || !this._ofsCanvas) return
    const { width, height } = this._options.canvas
    if (this._ofsCanvas.width !== width || this._ofsCanvas.height !== height) {
      this._ofsCanvas.width = width
      this._ofsCanvas.height = height
    }
  }

  clear(): void {
    if (!this._options) return
    const ctx = this._options.canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null
    if (ctx) {
      ctx.clearRect(
        0,
        0,
        this._options.canvas.width,
        this._options.canvas.height
      )
    }
  }

  drawFrame(frameIndex: number): void {
    if (!this._options || !this._context || !this._ofsCanvas) return

    const {
      videoEntity,
      bitmapsCache,
      canvas,
      dynamicElements,
      replaceElements
    } = this._options
    const context = this._context

    // 1. Clear offscreen
    context.clearRect(0, 0, this._ofsCanvas.width, this._ofsCanvas.height)

    // 2. Draw Sprites
    videoEntity.sprites.forEach((sprite) => {
      const bitmap = bitmapsCache[sprite.imageKey]
      const replaceElement = replaceElements[sprite.imageKey]
      const dynamicElement = dynamicElements[sprite.imageKey]
      drawSprite(
        context,
        sprite,
        frameIndex,
        bitmap,
        replaceElement,
        dynamicElement
      )
    })

    // 3. Blit to main canvas
    const mainCtx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
    if (mainCtx) {
      mainCtx.clearRect(0, 0, canvas.width, canvas.height) // Clear main before drawing? Or assumes Player clears?
      // The Player logic had this.clearContainer() before drawFrame.
      // But our clear() acts on the main canvas too.
      // Let's ensure we clear main canvas here or rely on the caller.
      // The previous code in player/index.ts cleared container before render().
      // So it's safe to clear here or just draw over.
      // Usually clearing is safer for transparency.
      // But wait, if we are double buffering, we overwrite everything IF the bounds match.
      mainCtx.drawImage(
        this._ofsCanvas,
        0,
        0,
        this._ofsCanvas.width,
        this._ofsCanvas.height,
        0,
        0,
        this._ofsCanvas.width,
        this._ofsCanvas.height
      )
    }
  }

  destroy(): void {
    this._options = null
    this._ofsCanvas = null
    this._context = null
  }
}

/* --- Drawing Helpers (Ported from render.ts) --- */

function drawSprite(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  sprite: VideoSprite,
  currentFrame: number,
  bitmap: Bitmap | undefined,
  replaceElement: ReplaceElement | undefined,
  dynamicElement: DynamicElement | undefined
): void {
  const frame = sprite.frames[currentFrame]

  if (frame.alpha < 0.05) return

  context.save()
  context.globalAlpha = frame.alpha

  context.transform(
    frame.transform?.a ?? 1,
    frame.transform?.b ?? 0,
    frame.transform?.c ?? 0,
    frame.transform?.d ?? 1,
    frame.transform?.tx ?? 0,
    frame.transform?.ty ?? 0
  )

  if (bitmap !== undefined) {
    if (frame.maskPath !== null) {
      drawBezier(
        context,
        frame.maskPath.commands,
        frame.maskPath.transform,
        frame.maskPath.styles
      )
      context.clip()
    }
    if (replaceElement !== undefined) {
      context.drawImage(
        replaceElement,
        0,
        0,
        frame.layout.width,
        frame.layout.height
      )
    } else {
      context.drawImage(bitmap, 0, 0, frame.layout.width, frame.layout.height)
    }
  }

  if (dynamicElement !== undefined) {
    context.drawImage(
      dynamicElement,
      (frame.layout.width - dynamicElement.width) / 2,
      (frame.layout.height - dynamicElement.height) / 2
    )
  }

  frame.shapes.forEach((shape) => drawShape(context, shape))

  context.restore()
}

function drawShape(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  shape: VideoFrameShape
): void {
  switch (shape.type) {
    case SHAPE_TYPE.SHAPE:
      drawBezier(context, shape.path.commands, shape.transform, shape.styles)
      break
    case SHAPE_TYPE.ELLIPSE:
      drawEllipse(
        context,
        shape.path.x ?? 0.0,
        shape.path.y ?? 0.0,
        shape.path.radiusX ?? 0.0,
        shape.path.radiusY ?? 0.0,
        shape.transform,
        shape.styles
      )
      break
    case SHAPE_TYPE.RECT:
      drawRect(
        context,
        shape.path.x ?? 0.0,
        shape.path.y ?? 0.0,
        shape.path.width ?? 0.0,
        shape.path.height ?? 0.0,
        shape.path.cornerRadius ?? 0.0,
        shape.transform,
        shape.styles
      )
      break
  }
}

function resetShapeStyles(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  styles: VideoStyles | undefined
): void {
  if (styles === undefined) return

  if (styles.stroke !== null) {
    context.strokeStyle = styles.stroke
  } else {
    context.strokeStyle = 'transparent'
  }

  if (styles.strokeWidth !== null && styles.strokeWidth > 0)
    context.lineWidth = styles.strokeWidth
  if (styles.miterLimit !== null && styles.miterLimit > 0)
    context.miterLimit = styles.miterLimit
  if (styles.lineCap !== null) context.lineCap = styles.lineCap
  if (styles.lineJoin !== null) context.lineJoin = styles.lineJoin

  if (styles.fill !== null) {
    context.fillStyle = styles.fill
  } else {
    context.fillStyle = 'transparent'
  }

  if (styles.lineDash !== null) context.setLineDash(styles.lineDash)
}

function drawBezier(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  commands: DrawCmd[] | undefined,
  transform: Transform | undefined,
  styles: VideoStyles
): void {
  context.save()
  resetShapeStyles(context, styles)
  if (transform !== undefined) {
    context.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx,
      transform.ty
    )
  }
  const currentPoint: CurrentPoint = { x: 0, y: 0, x1: 0, y1: 0, x2: 0, y2: 0 }
  context.beginPath()
  if (commands !== undefined) {
    for (const cmd of commands) {
      executeDrawCmd(context, currentPoint, cmd)
    }
  }
  if (styles.fill !== null) {
    context.fill()
  }
  if (styles.stroke !== null) {
    context.stroke()
  }
  context.restore()
}

function executeDrawCmd(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  currentPoint: CurrentPoint,
  cmd: DrawCmd
): void {
  const [op, ...args] = cmd

  switch (op) {
    case DrawOp.M: // moveTo absolute
      currentPoint.x = args[0]
      currentPoint.y = args[1]
      context.moveTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.m: // moveTo relative
      currentPoint.x += args[0]
      currentPoint.y += args[1]
      context.moveTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.L: // lineTo absolute
      currentPoint.x = args[0]
      currentPoint.y = args[1]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.l: // lineTo relative
      currentPoint.x += args[0]
      currentPoint.y += args[1]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.H: // horizontal lineTo absolute
      currentPoint.x = args[0]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.h: // horizontal lineTo relative
      currentPoint.x += args[0]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.V: // vertical lineTo absolute
      currentPoint.y = args[0]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.v: // vertical lineTo relative
      currentPoint.y += args[0]
      context.lineTo(currentPoint.x, currentPoint.y)
      break
    case DrawOp.C: // bezierCurveTo absolute
      currentPoint.x1 = args[0]
      currentPoint.y1 = args[1]
      currentPoint.x2 = args[2]
      currentPoint.y2 = args[3]
      currentPoint.x = args[4]
      currentPoint.y = args[5]
      context.bezierCurveTo(
        currentPoint.x1,
        currentPoint.y1,
        currentPoint.x2,
        currentPoint.y2,
        currentPoint.x,
        currentPoint.y
      )
      break
    case DrawOp.c: // bezierCurveTo relative
      currentPoint.x1 = currentPoint.x + args[0]
      currentPoint.y1 = currentPoint.y + args[1]
      currentPoint.x2 = currentPoint.x + args[2]
      currentPoint.y2 = currentPoint.y + args[3]
      currentPoint.x += args[4]
      currentPoint.y += args[5]
      context.bezierCurveTo(
        currentPoint.x1,
        currentPoint.y1,
        currentPoint.x2,
        currentPoint.y2,
        currentPoint.x,
        currentPoint.y
      )
      break
    case DrawOp.S: // smooth bezierCurveTo absolute
      if (
        currentPoint.x1 !== undefined &&
        currentPoint.y1 !== undefined &&
        currentPoint.x2 !== undefined &&
        currentPoint.y2 !== undefined
      ) {
        currentPoint.x1 = currentPoint.x - currentPoint.x2 + currentPoint.x
        currentPoint.y1 = currentPoint.y - currentPoint.y2 + currentPoint.y
        currentPoint.x2 = args[0]
        currentPoint.y2 = args[1]
        currentPoint.x = args[2]
        currentPoint.y = args[3]
        context.bezierCurveTo(
          currentPoint.x1,
          currentPoint.y1,
          currentPoint.x2,
          currentPoint.y2,
          currentPoint.x,
          currentPoint.y
        )
      } else {
        currentPoint.x1 = args[0]
        currentPoint.y1 = args[1]
        currentPoint.x = args[2]
        currentPoint.y = args[3]
        context.quadraticCurveTo(
          currentPoint.x1,
          currentPoint.y1,
          currentPoint.x,
          currentPoint.y
        )
      }
      break
    case DrawOp.s: // smooth bezierCurveTo relative
      if (
        currentPoint.x1 !== undefined &&
        currentPoint.y1 !== undefined &&
        currentPoint.x2 !== undefined &&
        currentPoint.y2 !== undefined
      ) {
        currentPoint.x1 = currentPoint.x - currentPoint.x2 + currentPoint.x
        currentPoint.y1 = currentPoint.y - currentPoint.y2 + currentPoint.y
        currentPoint.x2 = currentPoint.x + args[0]
        currentPoint.y2 = currentPoint.y + args[1]
        currentPoint.x += args[2]
        currentPoint.y += args[3]
        context.bezierCurveTo(
          currentPoint.x1,
          currentPoint.y1,
          currentPoint.x2,
          currentPoint.y2,
          currentPoint.x,
          currentPoint.y
        )
      } else {
        currentPoint.x1 = currentPoint.x + args[0]
        currentPoint.y1 = currentPoint.y + args[1]
        currentPoint.x += args[2]
        currentPoint.y += args[3]
        context.quadraticCurveTo(
          currentPoint.x1,
          currentPoint.y1,
          currentPoint.x,
          currentPoint.y
        )
      }
      break
    case DrawOp.Q: // quadraticCurveTo absolute
      currentPoint.x1 = args[0]
      currentPoint.y1 = args[1]
      currentPoint.x = args[2]
      currentPoint.y = args[3]
      context.quadraticCurveTo(
        currentPoint.x1,
        currentPoint.y1,
        currentPoint.x,
        currentPoint.y
      )
      break
    case DrawOp.q: // quadraticCurveTo relative
      currentPoint.x1 = currentPoint.x + args[0]
      currentPoint.y1 = currentPoint.y + args[1]
      currentPoint.x += args[2]
      currentPoint.y += args[3]
      context.quadraticCurveTo(
        currentPoint.x1,
        currentPoint.y1,
        currentPoint.x,
        currentPoint.y
      )
      break
    case DrawOp.Z: // closePath
      context.closePath()
      break
    default:
      break
  }
}

function drawEllipse(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  transform: Transform | undefined,
  styles: VideoStyles
): void {
  context.save()
  resetShapeStyles(context, styles)
  if (transform !== undefined) {
    context.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx,
      transform.ty
    )
  }
  x = x - radiusX
  y = y - radiusY
  const w = radiusX * 2
  const h = radiusY * 2
  const kappa = 0.5522848
  const ox = (w / 2) * kappa
  const oy = (h / 2) * kappa
  const xe = x + w
  const ye = y + h
  const xm = x + w / 2
  const ym = y + h / 2
  context.beginPath()
  context.moveTo(x, ym)
  context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y)
  context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym)
  context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye)
  context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym)
  if (styles.fill !== null) {
    context.fill()
  }
  if (styles.stroke !== null) {
    context.stroke()
  }
  context.restore()
}

function drawRect(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
  transform: Transform | undefined,
  styles: VideoStyles
): void {
  context.save()
  resetShapeStyles(context, styles)
  if (transform !== undefined) {
    context.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.tx,
      transform.ty
    )
  }
  let radius = cornerRadius
  if (width < 2 * radius) {
    radius = width / 2
  }
  if (height < 2 * radius) {
    radius = height / 2
  }
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
  if (styles.fill !== null) {
    context.fill()
  }
  if (styles.stroke !== null) {
    context.stroke()
  }
  context.restore()
}
