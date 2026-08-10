import { Parser, Player } from '../src/index'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const select = document.getElementById('svga-select') as HTMLSelectElement

// 使用 new URL + import.meta.url 显式引入静态资源，确保构建产物包含对应文件
const svgaKeys = [
  'angel',
  'shape-path-undefined',
  '11',
  'TwitterHeart',
  'loading-1',
  'kaola',
  'kingset'
] as const

const svgaUrlMap: Record<string, string> = Object.fromEntries(
  svgaKeys.map((key) => [
    key,
    new URL(`./svga/${key}.svga`, import.meta.url).href
  ])
)

let parser: Parser | null = null
let player: Player | null = null

async function ensureParser(): Promise<Parser> {
  if (parser === null) {
    parser = new Parser({ isDisableWebWorker: false })
  }
  return parser
}

async function ensurePlayer(): Promise<Player> {
  if (player === null) {
    player = new Player({
      container: canvas,
      loop: true
    })
  }
  return player
}

async function loadSvga(url: string): Promise<void> {
  const theParser = await ensureParser()
  const svga = await theParser.load(url)
  const thePlayer = await ensurePlayer()
  await thePlayer.mount(svga)
}

function getSelectedUrl(): string {
  const key = select.value
  const url = svgaUrlMap[key]
  if (!url) {
    throw new Error(`Unknown svga key: ${key}`)
  }
  return url
}

function safeAction(fn: (p: Player) => void): void {
  if (player === null) return
  fn(player)
}

async function loadSelected(): Promise<void> {
  try {
    await loadSvga(getSelectedUrl())
  } catch (error) {
    console.error('load failed', error)
  }
}

;(window as any).loadSelected = loadSelected
;(window as any).start = (): void => safeAction((p) => p.start())
;(window as any).pause = (): void => safeAction((p) => p.pause())
;(window as any).resume = (): void => safeAction((p) => p.resume())
;(window as any).stop = (): void => safeAction((p) => p.stop())
;(window as any).clear = (): void => {
  if (player) player.clear()
}
;(window as any).destroy = (): void => {
  if (parser) {
    parser.destroy()
    parser = null
  }
  if (player) {
    player.destroy()
    player = null
  }
}

// 默认加载第一个选项，方便直接点击 Start 体验
loadSelected().catch((error) => console.error(error))

;(window as any).benchmark = async (key: string = 'kingset') => {
  console.log(`Starting benchmark for ${key}...`)

  if (player) {
    player.destroy()
    player = null
  }
  if (parser) {
    parser.destroy()
    parser = null
  }

  const url = svgaUrlMap[key as any]
  if (!url) throw new Error(`Unknown key ${key}`)

  // 1. Load File (Network + Init)
  const t0 = performance.now()
  const theParser = await ensureParser()
  // @ts-ignore
  const videoItem = await theParser.load(url)
  const t1 = performance.now()
  console.log(`[Benchmark] Load & Init time: ${(t1 - t0).toFixed(2)}ms`)

  // 2. Parse All Frames (Force Lazy Parsing)
  const t2 = performance.now()
  let totalFrames = 0

  // Access every frame to trigger parsing
  // videoItem.sprites is the array of sprites
  for (const sprite of videoItem.sprites) {
    for (let i = 0; i < videoItem.frames; i++) {
      // Just accessing the index triggers the Proxy getter -> WASM parse
      const _frame = sprite.frames[i]
      totalFrames++
    }
  }

  const t3 = performance.now()
  const results = [
    `[Benchmark] Load & Init time: ${(t1 - t0).toFixed(2)}ms`,
    `[Benchmark] Parse All Frames time: ${(t3 - t2).toFixed(2)}ms`,
    `[Benchmark] Total frames: ${totalFrames}`,
    `[Benchmark] Average per frame: ${((t3 - t2) / totalFrames).toFixed(3)}ms`
  ].join('\n')

  console.log(results)

  let resultDiv = document.getElementById('benchmark-results')
  if (!resultDiv) {
    resultDiv = document.createElement('div')
    resultDiv.id = 'benchmark-results'
    resultDiv.style.position = 'fixed'
    resultDiv.style.top = '10px'
    resultDiv.style.right = '10px'
    resultDiv.style.backgroundColor = 'rgba(0,0,0,0.8)'
    resultDiv.style.color = '#0f0'
    resultDiv.style.padding = '20px'
    resultDiv.style.fontFamily = 'monospace'
    resultDiv.style.zIndex = '9999'
    document.body.appendChild(resultDiv)
  }
  resultDiv.innerText = results

  // Mount and play
  const thePlayer = await ensurePlayer()
  await thePlayer.mount(videoItem)
  thePlayer.start()
}
