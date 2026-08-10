import { logger } from '@/logger'
import {
  PLAYER_FILL_MODE,
  PLAYER_PLAY_MODE,
  PlayerConfigOptions,
  Video,
  BitmapsCache,
  PlayerConfig,
  IRenderer,
  Elements
} from '../types'
import { Animator } from './animator'
import { CanvasRenderer } from './renderers/canvas'

const inBrowser = typeof window !== 'undefined'
const hasIntersectionObserver = inBrowser && 'IntersectionObserver' in window

type EventCallback = undefined | (() => void)

/**
 * SVGA 播放器
 */
export class Player {
  /**
   * 动画当前帧数
   */
  public currentFrame: number = 0
  /**
   * 动画总帧数
   */
  public totalFrames: number = 0
  /**
   * SVGA 数据源
   */
  public videoEntity: Video | undefined = undefined

  /**
   * 当前配置项
   */
  public readonly config: PlayerConfig = {
    container: document.createElement('canvas'),
    loop: 0,
    fillMode: PLAYER_FILL_MODE.FORWARDS,
    playMode: PLAYER_PLAY_MODE.FORWARDS,
    startFrame: 0,
    endFrame: 0,
    loopStartFrame: 0,
    isCacheFrames: false,
    isUseIntersectionObserver: false,
    isOpenNoExecutionDelay: false
  }

  private readonly animator: Animator
  // private readonly ofsCanvas: HTMLCanvasElement | OffscreenCanvas // Handled by renderer
  private renderer: IRenderer | null = null

  private isCanvasVisible = true
  private intersectionObserver: IntersectionObserver | null = null
  private bitmapsCache: BitmapsCache = {}
  private readonly cacheFrames: {
    [key: string]: HTMLImageElement | ImageBitmap
  } = {}

  constructor(options: HTMLCanvasElement | PlayerConfigOptions) {
    this.animator = new Animator()
    this.animator.onEnd = () => {
      if (this.onEnd !== undefined) this.onEnd()
    }
    let container: HTMLCanvasElement | undefined
    if (options instanceof HTMLCanvasElement) {
      container = options
    } else if (options.container !== undefined) {
      container = options.container
      this.setConfig(options)
    }
    this.config.container = container ?? this.config.container
    // ofsCanvas removed
  }

  /**
   * 设置配置项
   * @param options 可配置项
   */
  public setConfig(options: PlayerConfigOptions): void {
    if (options.startFrame !== undefined && options.endFrame !== undefined) {
      if (options.startFrame > options.endFrame) {
        throw new Error('StartFrame should > EndFrame')
      }
    }
    this.config.container = options.container ?? this.config.container
    this.config.loop = options.loop ?? 0
    this.config.fillMode = options.fillMode ?? PLAYER_FILL_MODE.FORWARDS
    this.config.playMode = options.playMode ?? PLAYER_PLAY_MODE.FORWARDS
    this.config.startFrame = options.startFrame ?? 0
    this.config.endFrame = options.endFrame ?? 0
    this.config.loopStartFrame = options.loopStartFrame ?? 0
    this.config.isCacheFrames = options.isCacheFrames ?? false
    this.config.isUseIntersectionObserver =
      options.isUseIntersectionObserver ?? false
    this.config.isOpenNoExecutionDelay = options.isOpenNoExecutionDelay ?? false
    this.config.renderers = options.renderers
    this.animator.isOpenNoExecutionDelay =
      options.isOpenNoExecutionDelay ?? false
    // 监听容器是否处于浏览器视窗内
    this.setIntersectionObserver()
  }

  private setIntersectionObserver(): void {
    this.disconnectIntersectionObserver()

    if (hasIntersectionObserver && this.config.isUseIntersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.isCanvasVisible = !(entries[0].intersectionRatio <= 0)
          logger.debug('isCanvasVisible', this.isCanvasVisible)
        },
        {
          rootMargin: '0px',
          threshold: [0, 0.5, 1]
        }
      )
      this.intersectionObserver.observe(this.config.container)
    } else {
      this.config.isUseIntersectionObserver = false
    }
  }

  private disconnectIntersectionObserver(): void {
    if (this.intersectionObserver !== null) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
    this.isCanvasVisible = true
  }

  /**
   * 装载 SVGA 数据元
   * @param videoEntity SVGA 数据源
   * @returns Promise<void>
   */
  public async mount(videoEntity: Video, elements?: Elements): Promise<void> {
    logger.debug('mount: start', {
      frames: videoEntity.frames,
      size: videoEntity.size,
      fps: videoEntity.fps,
      imageCount: Object.keys(videoEntity.images).length
    })
    return await new Promise((resolve, reject) => {
      this.currentFrame = 0
      this.totalFrames = videoEntity.frames - 1
      this.videoEntity = videoEntity
      this.clearContainer()
      this.setSize()
      // base64 -> imageelement
      this.bitmapsCache = {}
      if (this.videoEntity === undefined) {
        resolve()
        return
      }

      const onImagesLoaded = async () => {
        // Initialize Renderer - try each in order until one succeeds
        try {
          if (this.renderer) {
            this.renderer.destroy()
          }

          const renderers = this.config.renderers ?? [new CanvasRenderer()]
          let lastError: Error | null = null

          for (const renderer of renderers) {
            try {
              logger.debug('mount: trying renderer', renderer.name)
              await renderer.init({
                canvas: this.config.container,
                videoEntity: this.videoEntity!,
                bitmapsCache: this.bitmapsCache,
                dynamicElements:
                  elements?.dynamicElements ??
                  this.videoEntity!.dynamicElements,
                replaceElements:
                  elements?.replaceElements ?? this.videoEntity!.replaceElements
              })
              this.renderer = renderer
              this.config.container.dataset['renderer'] = renderer.name
              logger.debug('mount: renderer initialized', renderer.name)
              resolve()
              return
            } catch (e) {
              lastError = e as Error
              logger.debug('mount: renderer failed', renderer.name, e)
              // Continue to next renderer
            }
          }

          reject(lastError ?? new Error('[SVGA] No supported renderer found'))
        } catch (e) {
          reject(e)
        }
      }

      if (Object.keys(this.videoEntity.images).length === 0) {
        logger.debug('mount: no images to load')
        onImagesLoaded()
        return
      }

      // First pass: count and process all images
      let pendingBase64 = 0
      let loadedBase64 = 0

      for (const key in this.videoEntity.images) {
        const image = this.videoEntity.images[key]
        if (typeof image === 'string') {
          // Base64 string - needs async loading
          pendingBase64++
          const img = document.createElement('img')
          img.src = 'data:image/png;base64,' + image
          this.bitmapsCache[key] = img
          img.onload = () => {
            loadedBase64++
            logger.debug(
              'mount: image loaded',
              `${loadedBase64}/${pendingBase64}`
            )
            if (loadedBase64 === pendingBase64) {
              onImagesLoaded()
            }
          }
        } else {
          // Already ImageBitmap - sync
          this.bitmapsCache[key] = image
        }
      }

      // If no async images, call immediately
      if (pendingBase64 === 0) {
        onImagesLoaded()
      }
    })
  }

  /**
   * 开始播放事件回调
   */
  public onStart: EventCallback
  /**
   * 重新播放事件回调
   */
  public onResume: EventCallback
  /**
   * 暂停播放事件回调
   */
  public onPause: EventCallback
  /**
   * 停止播放事件回调
   */
  public onStop: EventCallback
  /**
   * 播放中事件回调
   */
  public onProcess: EventCallback
  /**
   * 播放结束事件回调
   */
  public onEnd: EventCallback

  private clearContainer(): void {
    const width = this.config.container.width
    this.config.container.width = width
  }

  /**
   * 开始播放
   */
  public start(): void {
    if (this.videoEntity === undefined) throw new Error('videoEntity undefined')
    logger.debug('start: animation')
    this.clearContainer()
    this.startAnimation()
    if (this.onStart !== undefined) this.onStart()
  }

  /**
   * 重新播放
   */
  public resume(): void {
    logger.debug('resume: animation')
    this.startAnimation()
    if (this.onResume !== undefined) this.onResume()
  }

  /**
   * 暂停播放
   */
  public pause(): void {
    logger.debug('pause: animation')
    this.animator.stop()
    if (this.onPause !== undefined) this.onPause()
  }

  /**
   * 停止播放
   */
  public stop(): void {
    logger.debug('stop: animation')
    this.animator.stop()
    this.currentFrame = 0
    this.clearContainer()
    if (this.onStop !== undefined) this.onStop()
  }

  /**
   * 清理容器画布
   */
  public clear(): void {
    this.clearContainer()
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.disconnectIntersectionObserver()
    this.animator.stop()
    this.clearContainer()
    if (this.renderer) {
      this.renderer.destroy()
      this.renderer = null
    }
    ;(this.animator as any) = null
    ;(this.videoEntity as any) = null
  }

  private startAnimation(): void {
    if (this.videoEntity === undefined) throw new Error('videoEntity undefined')

    const { config, totalFrames, videoEntity } = this
    const { playMode, startFrame, endFrame, loopStartFrame, fillMode, loop } =
      config

    // 如果开始动画的当前帧是最后一帧，重置为第 0 帧
    if (this.currentFrame === totalFrames) {
      this.currentFrame = startFrame > 0 ? startFrame : 0
    }

    if (playMode === PLAYER_PLAY_MODE.FORWARDS) {
      this.animator.startValue = startFrame > 0 ? startFrame : 0
      this.animator.endValue = endFrame > 0 ? endFrame : totalFrames
    } else {
      // 倒播
      this.animator.startValue = endFrame > 0 ? endFrame : totalFrames
      this.animator.endValue = startFrame > 0 ? startFrame : 0
    }

    logger.debug('startAnimation: config', {
      playMode,
      startFrame: this.animator.startValue,
      endFrame: this.animator.endValue,
      loop,
      fps: videoEntity.fps
    })

    let frames = videoEntity.frames

    if (endFrame > 0 && endFrame > startFrame) {
      frames = endFrame - startFrame
    } else if (endFrame <= 0 && startFrame > 0) {
      frames = videoEntity.frames - startFrame
    }

    this.animator.duration = frames * (1.0 / videoEntity.fps) * 1000
    this.animator.loopStart =
      loopStartFrame > startFrame
        ? (loopStartFrame - startFrame) * (1.0 / videoEntity.fps) * 1000
        : 0
    this.animator.loop =
      loop === true || (typeof loop === 'number' && loop <= 0)
        ? Infinity
        : loop === false
          ? 1
          : (loop as number)
    this.animator.fillRule = fillMode === 'backwards' ? 1 : 0

    this.animator.onUpdate = (value: number) => {
      if (this.currentFrame === value) return
      this.currentFrame = value
      this.drawFrame(this.currentFrame)
      if (this.onProcess !== undefined) this.onProcess()
    }

    this.animator.start()
  }

  private setSize(): void {
    if (this.videoEntity === undefined) throw new Error('videoEntity undefined')
    const size = this.videoEntity.size
    this.config.container.width = size.width
    this.config.container.height = size.height
  }

  /// ----------- 描绘一帧 -----------
  private drawFrame(frame: number): void {
    if (this.videoEntity === undefined)
      throw new Error('Player VideoEntity undefined')
    if (this.config.isUseIntersectionObserver && !this.isCanvasVisible) return

    // Note: Calling clearContainer() here effectively clears the main canvas.
    // If renderer handles it (like CanvasRenderer does via blit), we might redundant clear.
    // But it's safer to keep for now unless it causes flicker.
    // Actually, CanvasRenderer blits the whole canvas, so it overwrites.
    // Providing 'container' to renderer means it outputs to it.

    // Check Cache
    if (this.config.isCacheFrames && this.cacheFrames[frame] !== undefined) {
      this.clearContainer() // Clear before drawing cache
      const context = this.config.container.getContext('2d')
      if (context) {
        const ofsFrame = this.cacheFrames[frame]
        context.drawImage(ofsFrame, 0, 0, ofsFrame.width, ofsFrame.height)
      }
      return
    }

    if (this.renderer) {
      this.renderer.drawFrame(frame)
    }

    if (this.config.isCacheFrames) {
      // Cache logic
      // We assume renderer has drawn to config.container
      if (this.config.container.toDataURL) {
        // HTMLCanvasElement
        const img = new Image()
        img.src = this.config.container.toDataURL()
        this.cacheFrames[frame] = img
      }
    }
  }
}
