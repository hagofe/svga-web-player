/**
 * Global Asset Manager for SVGA resources
 *
 * Provides centralized caching of VideoEntity and ImageBitmap to prevent
 * duplicate downloads and memory duplication when multiple Player instances
 * reference the same SVGA file.
 */

import type { Video, RawImages } from './types'

export interface CachedAsset {
  video: Video
  bitmaps: Map<string, ImageBitmap>
  refCount: number
}

/**
 * Global Asset Manager singleton
 *
 * Usage:
 * ```typescript
 * // Preload an SVGA file
 * const video = await assetManager.preload(url, parserInstance)
 *
 * // Get cached video (will throw if not preloaded)
 * const video = await assetManager.get(url)
 *
 * // Release when done (decrements ref count)
 * assetManager.release(url)
 *
 * // Force clear all assets
 * assetManager.clear()
 * ```
 */
export class AssetManager {
  /**
   * Cache for Video entities by URL
   * Using Promise to handle concurrent preload requests
   */
  private videoCache: Map<string, Promise<Video>> = new Map()

  /**
   * Cache for decoded ImageBitmaps by URL
   * Key format: `${url}#${imageKey}`
   */
  private bitmapCache: Map<string, ImageBitmap> = new Map()

  /**
   * Reference count per URL for memory management
   */
  private refCount: Map<string, number> = new Map()

  /**
   * Preload an SVGA file and cache the Video entity and ImageBitmaps.
   * If already cached, increments reference count and returns cached version.
   *
   * @param url - URL of the SVGA file
   * @param loadFn - Function that loads and parses the SVGA (e.g., parser.load)
   * @returns Promise resolving to the Video entity
   */
  async preload(
    url: string,
    loadFn: (url: string) => Promise<Video>
  ): Promise<Video> {
    const normalizedUrl = this.normalizeUrl(url)

    // Check if already loading or loaded
    const cached = this.videoCache.get(normalizedUrl)
    if (cached !== undefined) {
      this.incrementRef(normalizedUrl)
      return cached
    }

    // Create loading promise
    const loadingPromise = this.loadAndCache(normalizedUrl, loadFn)
    this.videoCache.set(normalizedUrl, loadingPromise)
    this.refCount.set(normalizedUrl, 1)

    return loadingPromise
  }

  /**
   * Get a cached Video entity by URL.
   * Returns undefined if not cached.
   */
  get(url: string): Promise<Video> | undefined {
    const normalizedUrl = this.normalizeUrl(url)
    return this.videoCache.get(normalizedUrl)
  }

  /**
   * Get a cached ImageBitmap by URL and image key.
   */
  getBitmap(url: string, imageKey: string): ImageBitmap | undefined {
    const bitmapKey = this.getBitmapKey(url, imageKey)
    return this.bitmapCache.get(bitmapKey)
  }

  /**
   * Get all cached bitmaps for a URL as a record.
   */
  getBitmaps(url: string): RawImages {
    const normalizedUrl = this.normalizeUrl(url)
    const prefix = `${normalizedUrl}#`
    const result: RawImages = {}

    this.bitmapCache.forEach((bitmap, key) => {
      if (key.startsWith(prefix)) {
        const imageKey = key.substring(prefix.length)
        result[imageKey] = bitmap
      }
    })

    return result
  }

  /**
   * Release a reference to a cached SVGA.
   * When reference count reaches 0, the asset may be eligible for cleanup.
   */
  release(url: string): void {
    const normalizedUrl = this.normalizeUrl(url)
    const count = this.refCount.get(normalizedUrl) ?? 0

    if (count <= 1) {
      this.cleanup(normalizedUrl)
    } else {
      this.refCount.set(normalizedUrl, count - 1)
    }
  }

  /**
   * Check if a URL is cached.
   */
  has(url: string): boolean {
    return this.videoCache.has(this.normalizeUrl(url))
  }

  /**
   * Get the reference count for a URL.
   */
  getRefCount(url: string): number {
    return this.refCount.get(this.normalizeUrl(url)) ?? 0
  }

  /**
   * Force clear all cached assets.
   * Closes all ImageBitmaps to free GPU memory.
   */
  clear(): void {
    // Close all ImageBitmaps
    this.bitmapCache.forEach((bitmap) => {
      if (bitmap.close) {
        bitmap.close()
      }
    })

    this.videoCache.clear()
    this.bitmapCache.clear()
    this.refCount.clear()
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats(): {
    videoCount: number
    bitmapCount: number
    totalRefCount: number
  } {
    let totalRefCount = 0
    this.refCount.forEach((count) => {
      totalRefCount += count
    })

    return {
      videoCount: this.videoCache.size,
      bitmapCount: this.bitmapCache.size,
      totalRefCount
    }
  }

  // Private methods

  private async loadAndCache(
    normalizedUrl: string,
    loadFn: (url: string) => Promise<Video>
  ): Promise<Video> {
    const video = await loadFn(normalizedUrl)

    // Cache ImageBitmaps from the loaded video
    await this.cacheImageBitmaps(normalizedUrl, video.images)

    return video
  }

  private async cacheImageBitmaps(
    normalizedUrl: string,
    images: RawImages
  ): Promise<void> {
    const supportsImageBitmap = typeof ImageBitmap !== 'undefined'

    for (const [imageKey, image] of Object.entries(images)) {
      const bitmapKey = this.getBitmapKey(normalizedUrl, imageKey)

      if (supportsImageBitmap && image instanceof ImageBitmap) {
        // Already an ImageBitmap, cache directly
        this.bitmapCache.set(bitmapKey, image)
      }
      // Note: HTMLImageElement and string images are handled by Player.mount()
      // We only cache ImageBitmap here for off-heap texture storage
    }
  }

  private cleanup(normalizedUrl: string): void {
    // Remove video cache
    this.videoCache.delete(normalizedUrl)
    this.refCount.delete(normalizedUrl)

    // Remove associated bitmaps
    const prefix = `${normalizedUrl}#`
    const keysToDelete: string[] = []

    this.bitmapCache.forEach((bitmap, key) => {
      if (key.startsWith(prefix)) {
        if (bitmap.close) {
          bitmap.close()
        }
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => this.bitmapCache.delete(key))
  }

  private incrementRef(url: string): void {
    const count = this.refCount.get(url) ?? 0
    this.refCount.set(url, count + 1)
  }

  private normalizeUrl(url: string): string {
    // Convert relative URLs to absolute
    if (url.indexOf('http') !== 0) {
      const a = document.createElement('a')
      a.href = url
      return a.href
    }
    return url
  }

  private getBitmapKey(url: string, imageKey: string): string {
    const normalizedUrl = this.normalizeUrl(url)
    return `${normalizedUrl}#${imageKey}`
  }
}

/**
 * Global singleton instance
 */
export const assetManager = new AssetManager()
