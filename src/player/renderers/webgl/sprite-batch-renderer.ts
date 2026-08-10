/**
 * SpriteBatchRenderer - 批量精灵渲染器
 *
 * 使用顶点缓冲区批量渲染带纹理的四边形，减少 draw call。
 */

import { Transform } from '../../../types'

// Shader sources for sprite batch rendering
export const SPRITE_VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  attribute float a_alpha;

  uniform vec2 u_resolution;

  varying vec2 v_texCoord;
  varying float v_alpha;

  void main() {
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
    v_alpha = a_alpha;
  }
`

export const SPRITE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_texture;

  varying vec2 v_texCoord;
  varying float v_alpha;

  void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    // For premultiplied alpha textures with premultiplied blend mode:
    // RGB is already premultiplied, just scale entire color by vertex alpha
    gl_FragColor = texColor * v_alpha;
  }
`

// Batch Constants
const MAX_SPRITES = 2000
const VERTEX_SIZE = 5 // x, y, u, v, alpha
const FLOATS_PER_SPRITE = 6 * VERTEX_SIZE
const BYTES_PER_FLOAT = 4
const BATCH_BUFFER_SIZE = MAX_SPRITES * FLOATS_PER_SPRITE * BYTES_PER_FLOAT

export class SpriteBatchRenderer {
  private _gl: WebGL2RenderingContext
  private _program: WebGLProgram
  private _vertexBuffer: WebGLBuffer

  private _vertices: Float32Array
  private _vertexIndex: number = 0

  private _resolutionLocation: WebGLUniformLocation | null = null

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this._gl = gl
    this._program = program
    this._vertices = new Float32Array(MAX_SPRITES * FLOATS_PER_SPRITE)

    this._vertexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, BATCH_BUFFER_SIZE, gl.DYNAMIC_DRAW)

    this._resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

    const stride = VERTEX_SIZE * BYTES_PER_FLOAT
    const aPosition = gl.getAttribLocation(program, 'a_position')
    const aTexCoord = gl.getAttribLocation(program, 'a_texCoord')
    const aAlpha = gl.getAttribLocation(program, 'a_alpha')

    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0)

    gl.enableVertexAttribArray(aTexCoord)
    gl.vertexAttribPointer(
      aTexCoord,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * BYTES_PER_FLOAT
    )

    gl.enableVertexAttribArray(aAlpha)
    gl.vertexAttribPointer(
      aAlpha,
      1,
      gl.FLOAT,
      false,
      stride,
      4 * BYTES_PER_FLOAT
    )
  }

  public begin(width: number, height: number): void {
    this._vertexIndex = 0
    this.rebindState()
    this._gl.uniform2f(this._resolutionLocation, width, height)
  }

  public end(): void {
    this.flush()
  }

  /**
   * Rebind program, buffer and vertex attributes after external GL state changes
   */
  public rebindState(): void {
    const gl = this._gl
    gl.useProgram(this._program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer)

    // Re-setup vertex attributes
    const stride = VERTEX_SIZE * BYTES_PER_FLOAT
    const aPosition = gl.getAttribLocation(this._program, 'a_position')
    const aTexCoord = gl.getAttribLocation(this._program, 'a_texCoord')
    const aAlpha = gl.getAttribLocation(this._program, 'a_alpha')

    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0)

    gl.enableVertexAttribArray(aTexCoord)
    gl.vertexAttribPointer(
      aTexCoord,
      2,
      gl.FLOAT,
      false,
      stride,
      2 * BYTES_PER_FLOAT
    )

    gl.enableVertexAttribArray(aAlpha)
    gl.vertexAttribPointer(
      aAlpha,
      1,
      gl.FLOAT,
      false,
      stride,
      4 * BYTES_PER_FLOAT
    )
  }

  /**
   * 绘制一个带纹理的四边形（Quad）到批处理缓冲区
   *
   * 工作原理：
   * 1. 一个四边形由 2 个三角形组成，共 6 个顶点
   * 2. 每个顶点包含 5 个 float：x, y, u, v, alpha
   * 3. 顶点数据累积在 CPU 缓冲区，flush() 时一次性上传到 GPU
   *
   * @param width   - 原始图片宽度（像素）
   * @param height  - 原始图片高度（像素）
   * @param transform - 2D 仿射变换矩阵 { a, b, c, d, tx, ty }
   * @param alpha   - 透明度 (0~1)
   * @param u0, v0  - 纹理左上角 UV 坐标
   * @param u1, v1  - 纹理右下角 UV 坐标
   */
  public draw(
    width: number,
    height: number,
    transform: Transform,
    alpha: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number
  ): void {
    // 如果缓冲区满了，先刷新到 GPU
    if (this._vertexIndex >= this._vertices.length) {
      this.flush()
    }

    const { a, b, c, d, tx, ty } = transform

    // 计算四个顶点的变换后坐标
    const x0 = tx
    const y0 = ty
    const x1 = a * width + tx
    const y1 = b * width + ty
    const x2 = c * height + tx
    const y2 = d * height + ty
    const x3 = a * width + c * height + tx
    const y3 = b * width + d * height + ty

    const i = this._vertexIndex
    const buffer = this._vertices

    // 三角形 1: 左上 → 右上 → 左下
    buffer[i] = x0
    buffer[i + 1] = y0
    buffer[i + 2] = u0
    buffer[i + 3] = v0
    buffer[i + 4] = alpha

    buffer[i + 5] = x1
    buffer[i + 6] = y1
    buffer[i + 7] = u1
    buffer[i + 8] = v0
    buffer[i + 9] = alpha

    buffer[i + 10] = x2
    buffer[i + 11] = y2
    buffer[i + 12] = u0
    buffer[i + 13] = v1
    buffer[i + 14] = alpha

    // 三角形 2: 左下 → 右上 → 右下
    buffer[i + 15] = x2
    buffer[i + 16] = y2
    buffer[i + 17] = u0
    buffer[i + 18] = v1
    buffer[i + 19] = alpha

    buffer[i + 20] = x1
    buffer[i + 21] = y1
    buffer[i + 22] = u1
    buffer[i + 23] = v0
    buffer[i + 24] = alpha

    buffer[i + 25] = x3
    buffer[i + 26] = y3
    buffer[i + 27] = u1
    buffer[i + 28] = v1
    buffer[i + 29] = alpha

    this._vertexIndex += 30
  }

  public flush(): void {
    if (this._vertexIndex === 0) return

    const gl = this._gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer)
    const view = this._vertices.subarray(0, this._vertexIndex)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, view)

    const vertexCount = this._vertexIndex / VERTEX_SIZE
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount)

    this._vertexIndex = 0
  }

  public destroy(): void {
    this._gl.deleteBuffer(this._vertexBuffer)
  }
}
