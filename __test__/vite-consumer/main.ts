import {
  CanvasRenderer,
  Parser,
  Player,
  setLogLevel
} from '@hagoss/svga-web-player'

interface FrameSample {
  frame: number
  alphaPixels: number
  checksum: number
}

interface VerificationEvidence {
  status: 'loading' | 'passed' | 'failed'
  strategy: 'auto' | 'js'
  workerUrls: string[]
  mainThreadRequests: string[]
  warnings: string[]
  errors: string[]
  resourceUrls: string[]
  frameSamples: FrameSample[]
  wasmSupported?: boolean
  renderer?: string
  canvasAnimated?: boolean
  error?: string
}

declare global {
  interface Window {
    __SVGA_VERIFY__: VerificationEvidence
  }
}

const strategy =
  new URLSearchParams(location.search).get('strategy') === 'js' ? 'js' : 'auto'
const evidence: VerificationEvidence = {
  status: 'loading',
  strategy,
  workerUrls: [],
  mainThreadRequests: [],
  warnings: [],
  errors: [],
  resourceUrls: [],
  frameSamples: []
}
window.__SVGA_VERIFY__ = evidence

const nativeWarn = console.warn.bind(console)
console.warn = (...args: unknown[]): void => {
  evidence.warnings.push(args.map(String).join(' '))
  nativeWarn(...args)
}

const nativeError = console.error.bind(console)
console.error = (...args: unknown[]): void => {
  evidence.errors.push(args.map(String).join(' '))
  nativeError(...args)
}

const NativeWorker = window.Worker
window.Worker = new Proxy(NativeWorker, {
  construct(Target, args) {
    evidence.workerUrls.push(String(args[0]))
    return new Target(args[0] as string | URL, args[1] as WorkerOptions)
  }
})

const nativeXhrOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (...args: any[]): void {
  evidence.mainThreadRequests.push(String(args[1]))
  nativeXhrOpen.apply(this, args as any)
}

function sampleCanvas(player: Player, canvas: HTMLCanvasElement): FrameSample {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('2D canvas context unavailable')
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let alphaPixels = 0
  let checksum = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] > 0) alphaPixels += 1
    checksum =
      (checksum +
        pixels[index] * 3 +
        pixels[index + 1] * 5 +
        pixels[index + 2] * 7 +
        pixels[index + 3] * 11) >>>
      0
  }
  return { frame: player.currentFrame, alphaPixels, checksum }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function collectResourceUrls(): string[] {
  return performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) =>
      [
        '@hagoss',
        'svga-web-player',
        '.vite/deps',
        'parser-worker',
        '.wasm'
      ].some((fragment) => url.includes(fragment))
    )
}

async function verify(): Promise<void> {
  setLogLevel('debug')
  const result = document.querySelector<HTMLPreElement>('#result')!
  const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
  const svgaUrl = new URL('../svga/TwitterHeart.svga', import.meta.url).href
  const parser = new Parser({
    parserStrategy: strategy,
    isDisableImageBitmapShim: true
  })
  const video = await parser.load(svgaUrl)
  evidence.wasmSupported = parser.isWasmSupported()

  const player = new Player({
    container: canvas,
    loop: true,
    renderers: [new CanvasRenderer()]
  })
  await player.mount(video)
  player.start()

  for (let index = 0; index < 6; index += 1) {
    await delay(120)
    evidence.frameSamples.push(sampleCanvas(player, canvas))
  }

  evidence.renderer = canvas.dataset.renderer
  evidence.canvasAnimated =
    new Set(evidence.frameSamples.map((sample) => sample.frame)).size > 1 &&
    evidence.frameSamples.some((sample) => sample.alphaPixels > 0) &&
    new Set(evidence.frameSamples.map((sample) => sample.checksum)).size > 1
  if (!evidence.canvasAnimated) {
    throw new Error('Canvas did not produce changing non-transparent frames')
  }

  evidence.resourceUrls = collectResourceUrls()
  evidence.status = 'passed'
  result.textContent = JSON.stringify(evidence, null, 2)
}

verify().catch((error) => {
  evidence.resourceUrls = collectResourceUrls()
  evidence.status = 'failed'
  evidence.error = error instanceof Error ? error.stack : String(error)
  document.querySelector<HTMLPreElement>('#result')!.textContent =
    JSON.stringify(evidence, null, 2)
  console.error(error)
})
