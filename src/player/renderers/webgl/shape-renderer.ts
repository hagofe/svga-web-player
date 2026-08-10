/**
 * ShapeRenderer - GPU-based shape rendering using Earcut.js
 *
 * Renders shapes (rect, ellipse, bezier paths) directly on GPU by:
 * 1. Converting path commands to vertices
 * 2. Triangulating with Earcut.js
 * 3. Rendering triangles with a solid color shader
 */

import earcut from 'earcut'
import {
  Transform,
  DrawCmd,
  VideoFrameShape,
  SHAPE_TYPE,
  RectPath,
  EllipsePath
} from '../../../types'
import { DrawOp } from '../../../path-compiler'
import { logger } from '../../../logger'

// Shader sources for solid color rendering
const SHAPE_VERTEX_SHADER = `
  attribute vec2 a_position;

  uniform vec2 u_resolution;
  uniform mat3 u_transform;

  void main() {
    // Apply transform
    vec3 transformed = u_transform * vec3(a_position, 1.0);

    // Convert to clip space
    vec2 clipSpace = (transformed.xy / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`

const SHAPE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`

// Bezier curve sampling resolution
const BEZIER_SAMPLE_COUNT = 10

interface CurrentPoint {
  x: number
  y: number
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Parse RGBA color string to [r, g, b, a] normalized values
 */
function parseRGBA(color: string | null): [number, number, number, number] {
  if (!color) return [0, 0, 0, 0]

  const match = color.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
  )
  if (!match) return [0, 0, 0, 0]

  return [
    parseInt(match[1]) / 255,
    parseInt(match[2]) / 255,
    parseInt(match[3]) / 255,
    match[4] !== undefined ? parseFloat(match[4]) : 1.0
  ]
}

/**
 * Convert DrawCmd[] to flat vertex array for triangulation
 */
function pathToVertices(commands: DrawCmd[] | undefined): number[] {
  if (!commands || commands.length === 0) return []

  const vertices: number[] = []
  const cp: CurrentPoint = { x: 0, y: 0, x1: 0, y1: 0, x2: 0, y2: 0 }

  for (const cmd of commands) {
    const [op, ...args] = cmd

    switch (op) {
      case DrawOp.M:
        cp.x = args[0]
        cp.y = args[1]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.m:
        cp.x += args[0]
        cp.y += args[1]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.L:
        cp.x = args[0]
        cp.y = args[1]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.l:
        cp.x += args[0]
        cp.y += args[1]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.H:
        cp.x = args[0]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.h:
        cp.x += args[0]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.V:
        cp.y = args[0]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.v:
        cp.y += args[0]
        vertices.push(cp.x, cp.y)
        break
      case DrawOp.C: {
        // Cubic bezier - sample points along curve
        const x0 = cp.x,
          y0 = cp.y
        cp.x1 = args[0]
        cp.y1 = args[1]
        cp.x2 = args[2]
        cp.y2 = args[3]
        cp.x = args[4]
        cp.y = args[5]
        sampleCubicBezier(
          vertices,
          x0,
          y0,
          cp.x1,
          cp.y1,
          cp.x2,
          cp.y2,
          cp.x,
          cp.y
        )
        break
      }
      case DrawOp.c: {
        const x0 = cp.x,
          y0 = cp.y
        cp.x1 = cp.x + args[0]
        cp.y1 = cp.y + args[1]
        cp.x2 = cp.x + args[2]
        cp.y2 = cp.y + args[3]
        cp.x += args[4]
        cp.y += args[5]
        sampleCubicBezier(
          vertices,
          x0,
          y0,
          cp.x1,
          cp.y1,
          cp.x2,
          cp.y2,
          cp.x,
          cp.y
        )
        break
      }
      case DrawOp.Q: {
        const x0 = cp.x,
          y0 = cp.y
        cp.x1 = args[0]
        cp.y1 = args[1]
        cp.x = args[2]
        cp.y = args[3]
        sampleQuadBezier(vertices, x0, y0, cp.x1, cp.y1, cp.x, cp.y)
        break
      }
      case DrawOp.q: {
        const x0 = cp.x,
          y0 = cp.y
        cp.x1 = cp.x + args[0]
        cp.y1 = cp.y + args[1]
        cp.x += args[2]
        cp.y += args[3]
        sampleQuadBezier(vertices, x0, y0, cp.x1, cp.y1, cp.x, cp.y)
        break
      }
      case DrawOp.Z:
        // Close path - no additional vertex needed
        break
    }
  }

  return vertices
}

/**
 * Sample points along a cubic bezier curve
 */
function sampleCubicBezier(
  vertices: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): void {
  for (let i = 1; i <= BEZIER_SAMPLE_COUNT; i++) {
    const t = i / BEZIER_SAMPLE_COUNT
    const t2 = t * t
    const t3 = t2 * t
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt

    const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3
    const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
    vertices.push(x, y)
  }
}

/**
 * Sample points along a quadratic bezier curve
 */
function sampleQuadBezier(
  vertices: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  for (let i = 1; i <= BEZIER_SAMPLE_COUNT; i++) {
    const t = i / BEZIER_SAMPLE_COUNT
    const mt = 1 - t

    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2
    vertices.push(x, y)
  }
}

/**
 * Generate vertices for a rectangle (with optional corner radius)
 */
function rectToVertices(rect: RectPath): number[] {
  const { x, y, width, height, cornerRadius } = rect

  if (cornerRadius <= 0) {
    // Simple rectangle
    return [x, y, x + width, y, x + width, y + height, x, y + height]
  }

  // Rounded rectangle - approximate corners with arcs
  const r = Math.min(cornerRadius, width / 2, height / 2)
  const vertices: number[] = []
  const steps = 4 // Points per corner

  // Top edge
  vertices.push(x + r, y)
  vertices.push(x + width - r, y)

  // Top-right corner
  for (let i = 0; i <= steps; i++) {
    const angle = (-Math.PI / 2) * (1 - i / steps)
    vertices.push(x + width - r + r * Math.cos(angle))
    vertices.push(y + r + r * Math.sin(angle))
  }

  // Right edge
  vertices.push(x + width, y + height - r)

  // Bottom-right corner
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI / 2) * (i / steps)
    vertices.push(x + width - r + r * Math.cos(angle))
    vertices.push(y + height - r + r * Math.sin(angle))
  }

  // Bottom edge
  vertices.push(x + r, y + height)

  // Bottom-left corner
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI / 2) * (1 + i / steps)
    vertices.push(x + r + r * Math.cos(angle))
    vertices.push(y + height - r + r * Math.sin(angle))
  }

  // Left edge
  vertices.push(x, y + r)

  // Top-left corner
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI * (1 + i / (2 * steps))
    vertices.push(x + r + r * Math.cos(angle))
    vertices.push(y + r + r * Math.sin(angle))
  }

  return vertices
}

/**
 * Generate vertices for an ellipse
 */
function ellipseToVertices(ellipse: EllipsePath): number[] {
  const { x, y, radiusX, radiusY } = ellipse
  const vertices: number[] = []
  const steps = 24 // Number of segments

  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    vertices.push(x + radiusX * Math.cos(angle))
    vertices.push(y + radiusY * Math.sin(angle))
  }

  return vertices
}

export class ShapeRenderer {
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram | null = null
  private _vertexBuffer: WebGLBuffer | null = null

  private _resolutionLoc: WebGLUniformLocation | null = null
  private _transformLoc: WebGLUniformLocation | null = null
  private _colorLoc: WebGLUniformLocation | null = null
  private _positionLoc: number = -1

  private _initialized: boolean = false

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl
  }

  /**
   * Initialize shaders and buffers (lazy init on first use)
   */
  private init(): boolean {
    if (this._initialized) return true

    const gl = this._gl

    // Compile shaders
    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      SHAPE_VERTEX_SHADER
    )
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      SHAPE_FRAGMENT_SHADER
    )

    if (!vertexShader || !fragmentShader) {
      logger.error('ShapeRenderer: Failed to compile shaders')
      return false
    }

    // Link program
    const program = gl.createProgram()
    if (!program) return false

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      logger.error('ShapeRenderer: Failed to link program')
      return false
    }

    this._program = program

    // Get uniform and attribute locations
    this._resolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    this._transformLoc = gl.getUniformLocation(program, 'u_transform')
    this._colorLoc = gl.getUniformLocation(program, 'u_color')
    this._positionLoc = gl.getAttribLocation(program, 'a_position')

    // Create vertex buffer
    this._vertexBuffer = gl.createBuffer()

    this._initialized = true
    return true
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this._gl
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('ShapeRenderer shader error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * Draw a shape using GPU triangulation
   */
  draw(
    shape: VideoFrameShape,
    parentTransform: Transform,
    alpha: number,
    width: number,
    height: number
  ): boolean {
    if (!this.init()) return false

    const gl = this._gl
    const { styles, transform } = shape

    // Skip if no fill (stroke-only shapes still use Canvas fallback)
    if (styles.fill === null) {
      return false
    }

    // Get vertices based on shape type
    let vertices: number[]
    switch (shape.type) {
      case SHAPE_TYPE.RECT:
        vertices = rectToVertices(shape.path)
        break
      case SHAPE_TYPE.ELLIPSE:
        vertices = ellipseToVertices(shape.path)
        break
      case SHAPE_TYPE.SHAPE:
        vertices = pathToVertices(shape.path.commands)
        break
      default:
        return false
    }

    if (vertices.length < 6) {
      return false // Need at least 3 points
    }

    // Triangulate with earcut
    const indices = earcut(vertices)
    if (indices.length === 0) {
      return false
    }

    // Build triangle vertices
    const triangleVertices = new Float32Array(indices.length * 2)
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      triangleVertices[i * 2] = vertices[idx * 2]
      triangleVertices[i * 2 + 1] = vertices[idx * 2 + 1]
    }

    // Setup GL state
    gl.useProgram(this._program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.DYNAMIC_DRAW)

    gl.enableVertexAttribArray(this._positionLoc)
    gl.vertexAttribPointer(this._positionLoc, 2, gl.FLOAT, false, 0, 0)

    // Set uniforms
    gl.uniform2f(this._resolutionLoc, width, height)

    // Combine transforms: parent * shape
    const combined = this.combineTransforms(parentTransform, transform)
    gl.uniformMatrix3fv(
      this._transformLoc,
      false,
      new Float32Array([
        combined.a,
        combined.b,
        0,
        combined.c,
        combined.d,
        0,
        combined.tx,
        combined.ty,
        1
      ])
    )

    // Set color with alpha
    const [r, g, b, a] = parseRGBA(styles.fill)
    gl.uniform4f(this._colorLoc, r, g, b, a * alpha)

    // Draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, indices.length)

    return true
  }

  private combineTransforms(parent: Transform, child: Transform): Transform {
    return {
      a: parent.a * child.a + parent.c * child.b,
      b: parent.b * child.a + parent.d * child.b,
      c: parent.a * child.c + parent.c * child.d,
      d: parent.b * child.c + parent.d * child.d,
      tx: parent.a * child.tx + parent.c * child.ty + parent.tx,
      ty: parent.b * child.tx + parent.d * child.ty + parent.ty
    }
  }

  destroy(): void {
    const gl = this._gl
    if (this._vertexBuffer) gl.deleteBuffer(this._vertexBuffer)
    if (this._program) gl.deleteProgram(this._program)
    this._initialized = false
  }
}
