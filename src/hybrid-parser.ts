/**
 * HybridParser - Unified SVGA Parser
 *
 * Automatically uses the fastest available parser (WASM) with JS fallback.
 * Supports forced strategy selection via options.
 */

import type { Video, ParserConfigOptions, ParserStrategy } from './types'
import { getWasmParser } from './wasm-parser'
import { Parser as JsParser } from './parser'
import { globalParseQueue } from './utils/global-queue'
import { logger } from './logger'

export class HybridParser {
  private jsParser: JsParser | null = null
  private wasmInitialized = false
  private wasmSupported: boolean | null = null
  private readonly strategy: ParserStrategy
  private readonly jsParserOptions: ParserConfigOptions
  private readonly options: ParserConfigOptions

  constructor(options: ParserConfigOptions = {}) {
    this.options = options
    this.strategy = options.parserStrategy ?? 'auto'
    this.jsParserOptions = {
      isDisableWebWorker: options.isDisableWebWorker,
      isDisableImageBitmapShim: options.isDisableImageBitmapShim,
      maxImageDecodeConcurrency: options.maxImageDecodeConcurrency
    }

    // Apply global concurrency limit if specified
    if (options.globalConcurrencyLimit !== undefined) {
      globalParseQueue.setLimit(options.globalConcurrencyLimit)
    }
  }

  /**
   * Initialize the parser (optional, called automatically on first load)
   */
  async init(): Promise<void> {
    if (this.strategy === 'js') {
      // JS-only mode, no WASM init needed
      this.wasmSupported = false
      return
    }

    if (!this.wasmInitialized) {
      await getWasmParser().init()
      this.wasmSupported = getWasmParser().isWasmSupported()
      this.wasmInitialized = true
    }
  }

  /**
   * Load and parse an SVGA file from URL
   * Uses global parse queue to limit concurrent parsing operations.
   */
  async load(url: string): Promise<Video> {
    return globalParseQueue.add(() => this._loadInternal(url))
  }

  /**
   * Internal load implementation (called within queue)
   */
  private async _loadInternal(url: string): Promise<Video> {
    // Ensure initialization
    await this.init()

    // Strategy: JS only
    if (this.strategy === 'js') {
      return this.loadWithJs(url)
    }

    // Strategy: WASM only
    if (this.strategy === 'wasm') {
      if (!this.wasmSupported) {
        throw new Error(
          '[HybridParser] WASM not supported but strategy is "wasm"'
        )
      }
      const video = await this.loadWithWasm(url)
      if (!video) {
        throw new Error('[HybridParser] WASM parsing failed')
      }
      return video
    }

    // Strategy: auto (default) - try WASM first, fallback to JS
    if (this.wasmSupported) {
      try {
        const video = await this.loadWithWasm(url)
        if (video) {
          return video
        }
        logger.warn('WASM parse returned null, falling back to JS')
      } catch (error) {
        logger.warn('WASM parse failed, falling back to JS:', error)
      }
    }

    // Fallback to JS
    return this.loadWithJs(url)
  }

  /**
   * Load using WASM parser
   */
  private async loadWithWasm(url: string): Promise<Video | null> {
    return getWasmParser().load(url)
  }

  /**
   * Load using JS parser
   */
  private async loadWithJs(url: string): Promise<Video> {
    if (!this.jsParser) {
      this.jsParser = new JsParser(this.jsParserOptions)
    }
    return this.jsParser.load(url)
  }

  /**
   * Check if WASM is supported and initialized
   */
  isWasmSupported(): boolean {
    return this.wasmSupported === true
  }

  /**
   * Get the current parser strategy
   */
  getStrategy(): ParserStrategy {
    return this.strategy
  }

  /**
   * Set the global concurrency limit for all parsers
   */
  static setGlobalConcurrencyLimit(limit: number): void {
    globalParseQueue.setLimit(limit)
  }

  /**
   * Destroy and cleanup resources
   */
  destroy(): void {
    if (this.jsParser) {
      this.jsParser.destroy()
      this.jsParser = null
    }
  }
}

// Default export instance for convenience
export const parser = new HybridParser()
