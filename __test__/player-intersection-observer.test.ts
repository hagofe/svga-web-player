import { afterEach, describe, expect, it, vi } from 'vitest'

class FakeCanvas {
  public width = 0
  public height = 0
  public readonly dataset: Record<string, string> = {}
}

const testVideo = {
  version: '2.0',
  size: { width: 1, height: 1 },
  fps: 60,
  frames: 2,
  images: {},
  replaceElements: {},
  dynamicElements: {},
  sprites: []
}

function createRenderer() {
  return {
    name: 'canvas' as const,
    init: vi.fn(async () => {}),
    drawFrame: vi.fn(),
    prepare: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn()
  }
}

async function loadPlayer(
  options: { supportsIntersectionObserver?: boolean } = {}
) {
  const { supportsIntersectionObserver = true } = options
  const observers: FakeIntersectionObserver[] = []
  const observerEvents: string[] = []

  class FakeIntersectionObserver {
    public readonly observe: ReturnType<typeof vi.fn>
    public readonly disconnect: ReturnType<typeof vi.fn>
    private readonly callback: IntersectionObserverCallback
    private readonly id: number

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
      this.id = observers.length
      this.observe = vi.fn(() => {
        observerEvents.push(`observe:${this.id}`)
      })
      this.disconnect = vi.fn(() => {
        observerEvents.push(`disconnect:${this.id}`)
      })
      observers.push(this)
      observerEvents.push(`create:${this.id}`)
    }

    public notify(intersectionRatio: number): void {
      this.callback(
        [{ intersectionRatio } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
    }
  }

  vi.resetModules()
  vi.stubGlobal(
    'window',
    supportsIntersectionObserver
      ? {
          IntersectionObserver: FakeIntersectionObserver,
          requestAnimationFrame: vi.fn()
        }
      : { requestAnimationFrame: vi.fn() }
  )
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      if (tagName === 'canvas') return new FakeCanvas()
      throw new Error(`Unexpected element: ${tagName}`)
    }
  })
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas)
  if (supportsIntersectionObserver) {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  }

  const { Player } = await import('../src/player')
  return { Player, observers, observerEvents }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('Player visibility observer lifecycle', () => {
  it('keeps visibility observation disabled by default', async () => {
    const { Player, observers } = await loadPlayer()
    const player = new Player(new FakeCanvas() as unknown as HTMLCanvasElement)

    expect(player.config.isUseIntersectionObserver).toBe(false)
    expect(observers).toHaveLength(0)
  })

  it('observes only the current canvas after repeated enabling', async () => {
    const { Player, observers, observerEvents } = await loadPlayer()
    const firstCanvas = new FakeCanvas() as unknown as HTMLCanvasElement
    const secondCanvas = new FakeCanvas() as unknown as HTMLCanvasElement
    const player = new Player({
      container: firstCanvas,
      isUseIntersectionObserver: true
    })

    expect(observers).toHaveLength(1)
    expect(observers[0].observe).toHaveBeenCalledWith(firstCanvas)

    player.setConfig({
      container: secondCanvas,
      isUseIntersectionObserver: true
    })

    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    expect(observers).toHaveLength(2)
    expect(observers[1].observe).toHaveBeenCalledWith(secondCanvas)
    expect(observerEvents.slice(2, 5)).toStrictEqual([
      'disconnect:0',
      'create:1',
      'observe:1'
    ])

    player.setConfig({ isUseIntersectionObserver: true })

    expect(observers[1].disconnect).toHaveBeenCalledOnce()
    expect(observers).toHaveLength(3)
    expect(observers[2].observe).toHaveBeenCalledWith(secondCanvas)
  })

  it('disconnects and releases its observer when visibility gating is disabled', async () => {
    const { Player, observers } = await loadPlayer()
    const player = new Player({
      container: new FakeCanvas() as unknown as HTMLCanvasElement,
      isUseIntersectionObserver: true
    })

    player.setConfig({ isUseIntersectionObserver: false })
    player.setConfig({ isUseIntersectionObserver: false })

    expect(player.config.isUseIntersectionObserver).toBe(false)
    expect(observers).toHaveLength(1)
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
  })

  it('falls back safely when IntersectionObserver is unavailable', async () => {
    const { Player, observers } = await loadPlayer({
      supportsIntersectionObserver: false
    })
    const player = new Player({
      container: new FakeCanvas() as unknown as HTMLCanvasElement,
      isUseIntersectionObserver: true
    })

    expect(player.config.isUseIntersectionObserver).toBe(false)
    expect(observers).toHaveLength(0)
    expect(() => player.destroy()).not.toThrow()
  })

  it('disconnects its active observer when destroyed', async () => {
    const { Player, observers } = await loadPlayer()
    const canvas = new FakeCanvas() as unknown as HTMLCanvasElement
    const player = new Player({
      container: canvas,
      isUseIntersectionObserver: true
    })

    player.destroy()

    expect(observers[0].disconnect).toHaveBeenCalledOnce()
  })

  it('resumes drawing after visibility gating is disabled', async () => {
    const { Player, observers } = await loadPlayer()
    const renderer = createRenderer()
    const player = new Player({
      container: new FakeCanvas() as unknown as HTMLCanvasElement,
      isUseIntersectionObserver: true,
      renderers: [renderer]
    })

    await player.mount(testVideo)
    observers[0].notify(0)
    player.currentFrame = -1
    player.start()

    expect(renderer.drawFrame).not.toHaveBeenCalled()

    player.pause()
    player.setConfig({ isUseIntersectionObserver: false })
    player.currentFrame = -1
    player.resume()

    expect(renderer.drawFrame).toHaveBeenCalledWith(0)
    player.pause()
  })

  it('does not carry an old canvas visibility state into a replacement canvas', async () => {
    const { Player, observers } = await loadPlayer()
    const renderer = createRenderer()
    const player = new Player({
      container: new FakeCanvas() as unknown as HTMLCanvasElement,
      isUseIntersectionObserver: true,
      renderers: [renderer]
    })

    await player.mount(testVideo)
    observers[0].notify(0)
    player.setConfig({
      container: new FakeCanvas() as unknown as HTMLCanvasElement,
      isUseIntersectionObserver: true,
      renderers: [renderer]
    })
    await player.mount(testVideo)
    player.currentFrame = -1
    player.resume()

    expect(renderer.drawFrame).toHaveBeenCalledWith(0)
    player.pause()
  })
})
