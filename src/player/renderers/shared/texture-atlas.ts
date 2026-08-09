/**
 * TextureAtlas - Packs multiple bitmaps into a single texture
 * Uses a simple shelf-based bin-packing algorithm
 */

import { Bitmap } from '../../../types'

export interface AtlasRegion {
  x: number
  y: number
  width: number
  height: number
  // Normalized UV coordinates (0-1)
  u0: number
  v0: number
  u1: number
  v1: number
}

interface ShelfRow {
  y: number
  height: number
  x: number // Current x position
}

interface CachedAtlas {
  atlas: TextureAtlas
  refCount: number
}

// Global cache for shared atlases (keyed by a hash of bitmap keys)
const atlasCache: Map<string, CachedAtlas> = new Map()

export class TextureAtlas {
  private _canvas: OffscreenCanvas | HTMLCanvasElement
  private _ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  private _regions: Map<string, AtlasRegion> = new Map()
  private _atlasWidth: number
  private _atlasHeight: number
  private _cacheKey: string | null = null

  /**
   * Get or create a shared atlas for the given bitmaps
   * Returns a tuple of [atlas, isNew] where isNew indicates if this is a fresh atlas
   */
  static getOrCreate(bitmaps: Record<string, Bitmap>): TextureAtlas {
    // Create a cache key from bitmap keys (sorted for consistency)
    const cacheKey = Object.keys(bitmaps).sort().join('|')

    const cached = atlasCache.get(cacheKey)
    if (cached) {
      cached.refCount++
      return cached.atlas
    }

    // Create new atlas
    const atlas = new TextureAtlas()
    atlas._cacheKey = cacheKey
    atlas.pack(bitmaps)

    atlasCache.set(cacheKey, { atlas, refCount: 1 })
    return atlas
  }

  /**
   * Release a reference to this atlas. When refCount reaches 0, it can be cleaned up.
   */
  release(): void {
    if (!this._cacheKey) return

    const cached = atlasCache.get(this._cacheKey)
    if (cached) {
      cached.refCount--
      if (cached.refCount <= 0) {
        atlasCache.delete(this._cacheKey)
      }
    }
  }

  constructor() {
    // Start with a reasonable size, will expand if needed
    this._atlasWidth = 2048
    this._atlasHeight = 2048

    if (typeof OffscreenCanvas !== 'undefined') {
      this._canvas = new OffscreenCanvas(this._atlasWidth, this._atlasHeight)
    } else {
      this._canvas = document.createElement('canvas')
      this._canvas.width = this._atlasWidth
      this._canvas.height = this._atlasHeight
    }

    this._ctx = this._canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
  }

  /**
   * Pack all bitmaps into the atlas
   * Returns the atlas canvas for texture creation
   */
  pack(bitmaps: Record<string, Bitmap>): OffscreenCanvas | HTMLCanvasElement {
    // Sort bitmaps by height (descending) for better packing
    const entries = Object.entries(bitmaps).sort(
      (a, b) => b[1].height - a[1].height
    )

    if (entries.length === 0) {
      return this._canvas
    }

    // Calculate required size
    const totalArea = entries.reduce(
      (sum, [, bmp]) => sum + bmp.width * bmp.height,
      0
    )
    const maxWidth = Math.max(...entries.map(([, bmp]) => bmp.width))
    const maxHeight = Math.max(...entries.map(([, bmp]) => bmp.height))

    // Estimate atlas size (with some padding)
    const estimatedSide = Math.ceil(Math.sqrt(totalArea) * 1.3)
    this._atlasWidth = Math.max(
      nextPowerOf2(Math.max(estimatedSide, maxWidth)),
      256
    )
    this._atlasHeight = Math.max(
      nextPowerOf2(Math.max(estimatedSide, maxHeight)),
      256
    )

    // Resize canvas
    this._canvas.width = this._atlasWidth
    this._canvas.height = this._atlasHeight

    // Clear canvas
    this._ctx.clearRect(0, 0, this._atlasWidth, this._atlasHeight)

    // Shelf-based packing
    const shelves: ShelfRow[] = []
    const padding = 2 // Pixel padding to prevent bleeding

    for (const [key, bitmap] of entries) {
      const w = bitmap.width + padding
      const h = bitmap.height + padding

      // Find a shelf that fits this bitmap
      let placed = false
      for (const shelf of shelves) {
        if (shelf.x + w <= this._atlasWidth && shelf.height >= h) {
          // Fits in this shelf
          this.placeRegion(key, bitmap, shelf.x, shelf.y)
          shelf.x += w
          placed = true
          break
        }
      }

      if (!placed) {
        // Create new shelf
        const newY =
          shelves.length === 0
            ? 0
            : shelves[shelves.length - 1].y + shelves[shelves.length - 1].height

        if (newY + h > this._atlasHeight) {
          // Need to expand atlas height
          this._atlasHeight = nextPowerOf2(newY + h)
          this.resizeCanvas()
        }

        shelves.push({ y: newY, height: h, x: w })
        this.placeRegion(key, bitmap, 0, newY)
      }
    }

    return this._canvas
  }

  private placeRegion(key: string, bitmap: Bitmap, x: number, y: number): void {
    // Draw bitmap to atlas
    this._ctx.drawImage(bitmap, x, y)

    // Calculate normalized UV coordinates
    const region: AtlasRegion = {
      x,
      y,
      width: bitmap.width,
      height: bitmap.height,
      u0: x / this._atlasWidth,
      v0: y / this._atlasHeight,
      u1: (x + bitmap.width) / this._atlasWidth,
      v1: (y + bitmap.height) / this._atlasHeight
    }

    this._regions.set(key, region)
  }

  private resizeCanvas(): void {
    // Save current content
    const imageData = this._ctx.getImageData(
      0,
      0,
      this._canvas.width,
      this._canvas.height
    )

    // Resize
    this._canvas.width = this._atlasWidth
    this._canvas.height = this._atlasHeight

    // Restore content
    this._ctx.putImageData(imageData, 0, 0)

    // Recalculate UV coordinates for existing regions
    for (const [_key, region] of this._regions) {
      region.u0 = region.x / this._atlasWidth
      region.v0 = region.y / this._atlasHeight
      region.u1 = (region.x + region.width) / this._atlasWidth
      region.v1 = (region.y + region.height) / this._atlasHeight
    }
  }

  /**
   * Get the UV region for a specific bitmap key
   */
  getRegion(key: string): AtlasRegion | undefined {
    return this._regions.get(key)
  }

  /**
   * Check if a key exists in the atlas
   */
  hasKey(key: string): boolean {
    return this._regions.has(key)
  }

  get width(): number {
    return this._atlasWidth
  }

  get height(): number {
    return this._atlasHeight
  }

  get canvas(): OffscreenCanvas | HTMLCanvasElement {
    return this._canvas
  }
}

function nextPowerOf2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}
