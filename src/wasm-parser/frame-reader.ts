/**
 * Binary Frame Reader - True Raw Transfer
 *
 * Reads frame data directly from WASM linear memory using DataView.
 * Zero-copy access to #[repr(C)] structures stored in WASM arena.
 */

// Shape types (must match Rust constants)
const SHAPE_TYPE_SHAPE = 0
const SHAPE_TYPE_RECT = 1
const SHAPE_TYPE_ELLIPSE = 2
const SHAPE_TYPE_KEEP = 3

// Style flags (must match Rust constants)
const STYLE_FLAG_HAS_FILL = 0b0000_0001
const STYLE_FLAG_HAS_STROKE = 0b0000_0010
const STYLE_FLAG_HAS_STROKE_WIDTH = 0b0000_0100
const STYLE_FLAG_HAS_LINE_CAP = 0b0000_1000
const STYLE_FLAG_HAS_LINE_JOIN = 0b0001_0000
const STYLE_FLAG_HAS_MITER_LIMIT = 0b0010_0000
const STYLE_FLAG_HAS_LINE_DASH = 0b0100_0000

export interface RawFrame {
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
  clip_path: string
  shapes: RawShape[]
}

export interface RawShape {
  type: 'Shape' | 'Rect' | 'Ellipse' | 'Keep'
  d?: string
  x?: number
  y?: number
  width?: number
  height?: number
  corner_radius?: number
  radius_x?: number
  radius_y?: number
  styles?: RawShapeStyle
  transform?: {
    a: number
    b: number
    c: number
    d: number
    tx: number
    ty: number
  }
}

export interface RawShapeStyle {
  fill?: { r: number; g: number; b: number; a: number }
  stroke?: { r: number; g: number; b: number; a: number }
  stroke_width?: number
  line_cap?: number
  line_join?: number
  miter_limit?: number
  line_dash?: number[]
}

/**
 * Memory reader for direct WASM memory access.
 * Caches struct sizes and base pointers for efficient reads.
 */
export class WasmMemoryReader {
  private memory: WebAssembly.Memory
  private view: DataView
  private textDecoder: TextDecoder

  // Struct sizes (obtained from WASM)
  private frameSize: number
  private shapeSize: number
  private styleSize: number

  // Base pointers (updated when arena changes)
  private framesPtr: number = 0
  private shapesPtr: number = 0
  private stylesPtr: number = 0
  private stringsPtr: number = 0
  private floatsPtr: number = 0

  constructor(
    memory: WebAssembly.Memory,
    frameSize: number,
    shapeSize: number,
    styleSize: number
  ) {
    this.memory = memory
    this.view = new DataView(memory.buffer)
    this.textDecoder = new TextDecoder()
    this.frameSize = frameSize
    this.shapeSize = shapeSize
    this.styleSize = styleSize
  }

  /**
   * Refresh DataView after memory buffer may have changed (e.g., after WASM allocation)
   */
  refreshView() {
    this.view = new DataView(this.memory.buffer)
  }

  /**
   * Update base pointers from WASM
   */
  updatePointers(
    framesPtr: number,
    shapesPtr: number,
    stylesPtr: number,
    stringsPtr: number,
    floatsPtr: number
  ) {
    this.framesPtr = framesPtr
    this.shapesPtr = shapesPtr
    this.stylesPtr = stylesPtr
    this.stringsPtr = stringsPtr
    this.floatsPtr = floatsPtr
  }

  /**
   * Read a frame by its index in the arena
   */
  readFrame(frameIndex: number): RawFrame {
    this.refreshView()
    const ptr = this.framesPtr + frameIndex * this.frameSize

    // Read frame fields (matching RawFrame #[repr(C)] layout)
    const alpha = this.view.getFloat32(ptr + 0, true)
    const layoutX = this.view.getFloat32(ptr + 4, true)
    const layoutY = this.view.getFloat32(ptr + 8, true)
    const layoutWidth = this.view.getFloat32(ptr + 12, true)
    const layoutHeight = this.view.getFloat32(ptr + 16, true)
    const transformA = this.view.getFloat32(ptr + 20, true)
    const transformB = this.view.getFloat32(ptr + 24, true)
    const transformC = this.view.getFloat32(ptr + 28, true)
    const transformD = this.view.getFloat32(ptr + 32, true)
    const transformTx = this.view.getFloat32(ptr + 36, true)
    const transformTy = this.view.getFloat32(ptr + 40, true)
    const clipPathOffset = this.view.getUint32(ptr + 44, true)
    const clipPathLen = this.view.getUint32(ptr + 48, true)
    const shapesOffset = this.view.getUint32(ptr + 52, true)
    const shapesCount = this.view.getUint32(ptr + 56, true)

    // Read clip_path string
    const clip_path = this.readString(clipPathOffset, clipPathLen)

    // Read shapes
    const shapes: RawShape[] = []
    for (let i = 0; i < shapesCount; i++) {
      shapes.push(this.readShape(shapesOffset + i))
    }

    return {
      alpha,
      layout: {
        x: layoutX,
        y: layoutY,
        width: layoutWidth,
        height: layoutHeight
      },
      transform: {
        a: transformA,
        b: transformB,
        c: transformC,
        d: transformD,
        tx: transformTx,
        ty: transformTy
      },
      clip_path,
      shapes
    }
  }

  /**
   * Read a shape by its index in the arena
   */
  private readShape(shapeIndex: number): RawShape {
    const ptr = this.shapesPtr + shapeIndex * this.shapeSize

    // Read shape fields (matching RawShape #[repr(C)] layout)
    const shapeType = this.view.getUint8(ptr + 0)
    // 3 bytes padding at ptr + 1,2,3
    const transformA = this.view.getFloat32(ptr + 4, true)
    const transformB = this.view.getFloat32(ptr + 8, true)
    const transformC = this.view.getFloat32(ptr + 12, true)
    const transformD = this.view.getFloat32(ptr + 16, true)
    const transformTx = this.view.getFloat32(ptr + 20, true)
    const transformTy = this.view.getFloat32(ptr + 24, true)
    const stylesOffset = this.view.getUint32(ptr + 28, true)

    // Data array starts at ptr + 32 (5 x u32 = 20 bytes)
    const data0 = this.view.getUint32(ptr + 32, true)
    const data1 = this.view.getUint32(ptr + 36, true)
    const data2 = this.view.getUint32(ptr + 40, true)
    const data3 = this.view.getUint32(ptr + 44, true)
    const data4 = this.view.getUint32(ptr + 48, true)

    const transform = {
      a: transformA,
      b: transformB,
      c: transformC,
      d: transformD,
      tx: transformTx,
      ty: transformTy
    }

    const styles = stylesOffset > 0 ? this.readStyle(stylesOffset) : undefined

    switch (shapeType) {
      case SHAPE_TYPE_SHAPE: {
        const dOffset = data0
        const dLen = data1
        const d = this.readString(dOffset, dLen)
        return { type: 'Shape', d, transform, styles }
      }

      case SHAPE_TYPE_RECT: {
        // data contains f32 values stored as bits
        const x = this.uint32ToFloat32(data0)
        const y = this.uint32ToFloat32(data1)
        const width = this.uint32ToFloat32(data2)
        const height = this.uint32ToFloat32(data3)
        const corner_radius = this.uint32ToFloat32(data4)
        return {
          type: 'Rect',
          x,
          y,
          width,
          height,
          corner_radius,
          transform,
          styles
        }
      }

      case SHAPE_TYPE_ELLIPSE: {
        const x = this.uint32ToFloat32(data0)
        const y = this.uint32ToFloat32(data1)
        const radius_x = this.uint32ToFloat32(data2)
        const radius_y = this.uint32ToFloat32(data3)
        return { type: 'Ellipse', x, y, radius_x, radius_y, transform, styles }
      }

      case SHAPE_TYPE_KEEP:
      default:
        return { type: 'Keep' }
    }
  }

  /**
   * Read a style by its index in the arena
   */
  private readStyle(styleIndex: number): RawShapeStyle {
    const ptr = this.stylesPtr + styleIndex * this.styleSize

    // Read style fields (matching RawStyle #[repr(C)] layout)
    const flags = this.view.getUint8(ptr + 0)
    const lineCap = this.view.getUint8(ptr + 1)
    const lineJoin = this.view.getUint8(ptr + 2)
    const lineDashCount = this.view.getUint8(ptr + 3)
    const fillR = this.view.getFloat32(ptr + 4, true)
    const fillG = this.view.getFloat32(ptr + 8, true)
    const fillB = this.view.getFloat32(ptr + 12, true)
    const fillA = this.view.getFloat32(ptr + 16, true)
    const strokeR = this.view.getFloat32(ptr + 20, true)
    const strokeG = this.view.getFloat32(ptr + 24, true)
    const strokeB = this.view.getFloat32(ptr + 28, true)
    const strokeA = this.view.getFloat32(ptr + 32, true)
    const strokeWidth = this.view.getFloat32(ptr + 36, true)
    const miterLimit = this.view.getFloat32(ptr + 40, true)
    const lineDashOffset = this.view.getUint32(ptr + 44, true)

    const style: RawShapeStyle = {}

    if (flags & STYLE_FLAG_HAS_FILL) {
      style.fill = { r: fillR, g: fillG, b: fillB, a: fillA }
    }
    if (flags & STYLE_FLAG_HAS_STROKE) {
      style.stroke = { r: strokeR, g: strokeG, b: strokeB, a: strokeA }
    }
    if (flags & STYLE_FLAG_HAS_STROKE_WIDTH) {
      style.stroke_width = strokeWidth
    }
    if (flags & STYLE_FLAG_HAS_LINE_CAP) {
      style.line_cap = lineCap
    }
    if (flags & STYLE_FLAG_HAS_LINE_JOIN) {
      style.line_join = lineJoin
    }
    if (flags & STYLE_FLAG_HAS_MITER_LIMIT) {
      style.miter_limit = miterLimit
    }
    if (flags & STYLE_FLAG_HAS_LINE_DASH && lineDashCount > 0) {
      style.line_dash = this.readFloatArray(lineDashOffset, lineDashCount)
    }

    return style
  }

  /**
   * Read a string from the strings buffer
   */
  private readString(offset: number, len: number): string {
    if (len === 0) return ''
    const bytes = new Uint8Array(
      this.memory.buffer,
      this.stringsPtr + offset,
      len
    )
    return this.textDecoder.decode(bytes)
  }

  /**
   * Read float array from the floats buffer
   */
  private readFloatArray(offset: number, count: number): number[] {
    const result: number[] = []
    const basePtr = this.floatsPtr + offset * 4
    for (let i = 0; i < count; i++) {
      result.push(this.view.getFloat32(basePtr + i * 4, true))
    }
    return result
  }

  /**
   * Convert u32 bit pattern to f32
   */
  private uint32ToFloat32(bits: number): number {
    const buffer = new ArrayBuffer(4)
    const u32View = new Uint32Array(buffer)
    const f32View = new Float32Array(buffer)
    u32View[0] = bits
    return f32View[0]
  }
}
