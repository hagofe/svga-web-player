/**
 * SVGA Benchmark - Compare optimized version vs original
 * Phase 1: Asset Caching comparison
 * Phase 2: WASM vs JS Parser comparison
 */
import {
  Parser,
  Player,
  assetManager,
  getWasmParser,
  CanvasRenderer,
  WebGLRenderer,
  WebGPURenderer,
  type IRenderer
} from '../src/index'

// Types for the original SVGA library loaded via CDN
declare global {
  interface Window {
    SVGA: {
      Parser: new (options?: { isDisableWebWorker?: boolean }) => {
        load: (url: string) => Promise<any>
        destroy: () => void
      }
      Player: new (
        canvas: HTMLCanvasElement | { container: HTMLCanvasElement }
      ) => {
        mount: (svga: any) => Promise<void>
        start: () => void
        stop: () => void
        destroy: () => void
        onProcess?: () => void
        currentFrame: number
        totalFrames: number
      }
    }
  }
}

interface BenchmarkResult {
  parseTime: number
  mountTime: number
  totalTime: number
  fps: number
  frameTimeAvg: number
  frameTimeMin: number
  frameTimeMax: number
  frameTimeVariance: number
  instanceCount: number
}

interface ParserBenchmarkResult {
  times: number[]
  avg: number
  min: number
  max: number
}

// ==================== Phase 1: Asset Caching Benchmark ====================

// DOM elements - Phase 1
const instanceCountInput = document.getElementById(
  'instanceCount'
) as HTMLInputElement
const svgaFileSelect = document.getElementById('svgaFile') as HTMLSelectElement
const addTestZoneBtn = document.getElementById(
  'addTestZone'
) as HTMLButtonElement
const clearAllBtn = document.getElementById('clearAll') as HTMLButtonElement
const testZonesContainer = document.getElementById(
  'testZonesContainer'
) as HTMLDivElement
const logEl = document.getElementById('log') as HTMLDivElement

// Test Zone interface
interface TestZone {
  id: number
  element: HTMLDivElement
  playerType: 'new' | 'original'
  rendererMode: 'auto' | 'webgpu' | 'webgl' | 'canvas'
  parserMode: 'auto' | 'wasm' | 'js'
  isRunning: boolean
  players: Player[] | any[]
  result: BenchmarkResult | null
  perfTracker: ReturnType<typeof createPerformanceTracker> | null
}

// State - Phase 1
const testZones: Map<number, TestZone> = new Map()
let nextZoneId = 1

// Logging
function log(
  message: string,
  type: 'info' | 'success' | 'warn' | 'error' = 'info',
  targetLog?: HTMLDivElement
) {
  const logTarget = targetLog || logEl
  const entry = document.createElement('div')
  entry.className = `log-entry ${type}`
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  logTarget.appendChild(entry)
  logTarget.scrollTop = logTarget.scrollHeight
}

// Performance tracker
function createPerformanceTracker() {
  let frameCount = 0
  let startTime = 0
  let lastFrameTime = 0
  const frameDurations: number[] = []

  return {
    start() {
      frameCount = 0
      startTime = performance.now()
      lastFrameTime = startTime
      frameDurations.length = 0
    },
    tick() {
      const now = performance.now()
      frameCount++

      // Calculate frame duration
      const duration = now - lastFrameTime

      // Filter out first few frames and very long frames (tab switch)
      if (frameCount > 5 && duration < 500) {
        frameDurations.push(duration)
      }

      lastFrameTime = now
    },
    getFPS() {
      const duration = performance.now() - startTime
      // Prevent division by zero
      if (duration === 0) return 0
      return (frameCount / duration) * 1000
    },
    getStats() {
      if (frameDurations.length === 0)
        return { avg: 0, min: 0, max: 0, variance: 0 }

      const sum = frameDurations.reduce((a, b) => a + b, 0)
      const avg = sum / frameDurations.length
      const min = Math.min(...frameDurations)
      const max = Math.max(...frameDurations)

      const variance =
        frameDurations.reduce((a, b) => a + Math.pow(b - avg, 2), 0) /
        frameDurations.length

      return { avg, min, max, variance }
    }
  }
}

// Create canvas elements
function createCanvases(
  container: HTMLDivElement,
  count: number
): HTMLCanvasElement[] {
  container.innerHTML = ''
  const canvases: HTMLCanvasElement[] = []
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas')
    canvas.width = 150
    canvas.height = 150
    container.appendChild(canvas)
    canvases.push(canvas)
  }
  return canvases
}

// Create a new test zone
function createTestZone(): TestZone {
  const id = nextZoneId++

  const zoneElement = document.createElement('div')
  zoneElement.className = 'test-zone'
  zoneElement.id = `test-zone-${id}`
  zoneElement.innerHTML = `
    <div class="test-zone-header">
      <span class="test-zone-title">Test Zone ${id}</span>
      <button class="test-zone-remove" data-zone-id="${id}">✕</button>
    </div>
    <div class="test-zone-controls">
      <select class="zone-player-type" data-zone-id="${id}">
        <option value="new">New Version</option>
        <option value="original">Original Version</option>
      </select>
      <select class="zone-renderer" data-zone-id="${id}">
        <option value="auto">Auto</option>
        <option value="webgpu">WebGPU</option>
        <option value="webgl">WebGL</option>
        <option value="canvas">Canvas</option>
      </select>
      <select class="zone-parser" data-zone-id="${id}">
        <option value="auto">Parser: Auto</option>
        <option value="wasm">Parser: WASM</option>
        <option value="js">Parser: JS</option>
      </select>
      <button class="test-zone-btn-run zone-run-btn" data-zone-id="${id}">▶ Run</button>
      <button class="test-zone-btn-stop zone-stop-btn" data-zone-id="${id}" style="display: none;">⏹ Stop</button>
    </div>
    <div class="frame-control" style="margin: 10px 0; padding: 0 10px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 12px; color: #888;">Frame:</span>
        <input type="range" class="zone-frame-slider" data-zone-id="${id}" min="0" max="0" value="0" style="flex: 1;">
        <span class="zone-frame-display" style="font-size: 12px; min-width: 60px;">0 / 0</span>
      </div>
    </div>
    <div class="canvas-container zone-canvas-container"></div>
    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Parse Time</div>
        <div class="metric-value zone-parse-time">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Mount Time</div>
        <div class="metric-value zone-mount-time">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Time</div>
        <div class="metric-value zone-total-time">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">FPS (avg)</div>
        <div class="metric-value zone-fps">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Frame Time (avg)</div>
        <div class="metric-value zone-frame-avg">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Frame Time (min/max)</div>
        <div class="metric-value zone-frame-minmax" style="font-size: 14px">-</div>
      </div>
      <div class="metric">
        <div class="metric-label">Variance</div>
        <div class="metric-value zone-frame-var">-</div>
      </div>
    </div>
  `

  testZonesContainer.appendChild(zoneElement)

  const zone: TestZone = {
    id,
    element: zoneElement,
    playerType: 'new',
    rendererMode: 'auto',
    parserMode: 'auto',
    isRunning: false,
    players: [],
    result: null,
    perfTracker: null
  }

  testZones.set(id, zone)

  // Setup event listeners
  setupZoneEventListeners(zone)

  log(`Created Test Zone ${id}`, 'info')
  return zone
}

// Setup event listeners for a zone
function setupZoneEventListeners(zone: TestZone) {
  const { element, id } = zone

  // Player type change
  const playerTypeSelect = element.querySelector(
    '.zone-player-type'
  ) as HTMLSelectElement
  const rendererSelect = element.querySelector(
    '.zone-renderer'
  ) as HTMLSelectElement
  const parserSelect = element.querySelector(
    '.zone-parser'
  ) as HTMLSelectElement

  playerTypeSelect.addEventListener('change', () => {
    zone.playerType = playerTypeSelect.value as 'new' | 'original'
    // Hide renderer and parser select for original version
    rendererSelect.style.display = zone.playerType === 'new' ? '' : 'none'
    parserSelect.style.display = zone.playerType === 'new' ? '' : 'none'
  })

  rendererSelect.addEventListener('change', () => {
    zone.rendererMode = rendererSelect.value as
      | 'auto'
      | 'webgpu'
      | 'webgl'
      | 'canvas'
  })

  parserSelect.addEventListener('change', () => {
    zone.parserMode = parserSelect.value as 'auto' | 'wasm' | 'js'
  })

  // Run button
  element
    .querySelector('.zone-run-btn')
    ?.addEventListener('click', () => runTestZone(id))

  // Stop button
  element
    .querySelector('.zone-stop-btn')
    ?.addEventListener('click', () => stopTestZone(id))

  // Remove button
  element.querySelector('.test-zone-remove')?.addEventListener('click', () => {
    removeTestZone(id)
  })

  // Frame slider - for frame-by-frame scrubbing
  const frameSlider = element.querySelector(
    '.zone-frame-slider'
  ) as HTMLInputElement
  const frameDisplay = element.querySelector(
    '.zone-frame-display'
  ) as HTMLSpanElement

  frameSlider?.addEventListener('input', () => {
    const frameNum = parseInt(frameSlider.value, 10)

    // Pause all players and draw the specific frame
    zone.players.forEach((player: any) => {
      if (typeof player.pause === 'function') {
        player.pause()
      }
      if (typeof player.drawFrame === 'function') {
        player.drawFrame(frameNum)
      }
    })

    // Update display
    if (frameDisplay) {
      frameDisplay.textContent = `${frameNum} / ${frameSlider.max}`
    }
  })
}

// Run a test zone
async function runTestZone(id: number) {
  const zone = testZones.get(id)
  if (!zone || zone.isRunning) return

  zone.isRunning = true
  zone.element.classList.add('running')

  const runBtn = zone.element.querySelector(
    '.zone-run-btn'
  ) as HTMLButtonElement
  const stopBtn = zone.element.querySelector(
    '.zone-stop-btn'
  ) as HTMLButtonElement
  runBtn.style.display = 'none'
  stopBtn.style.display = ''

  const count = parseInt(instanceCountInput.value, 10)
  const url = svgaFileSelect.value
  const canvasContainer = zone.element.querySelector(
    '.zone-canvas-container'
  ) as HTMLDivElement

  log(
    `[Zone ${id}] Starting ${zone.playerType} (${zone.rendererMode})...`,
    'info'
  )

  try {
    if (zone.playerType === 'new') {
      zone.result = await runNewVersionBenchmark(
        zone,
        url,
        count,
        canvasContainer
      )
    } else {
      zone.result = await runOriginalVersionBenchmark(
        zone,
        url,
        count,
        canvasContainer
      )
    }

    updateZoneMetrics(zone, zone.result)
    log(`[Zone ${id}] Complete! FPS: ${zone.result.fps}`, 'success')
  } catch (error) {
    log(`[Zone ${id}] Error: ${error}`, 'error')
    console.error(error)
  }
}

// Run new version benchmark
async function runNewVersionBenchmark(
  zone: TestZone,
  url: string,
  count: number,
  canvasContainer: HTMLDivElement
): Promise<BenchmarkResult> {
  const canvases = createCanvases(canvasContainer, count)

  // Create parser with selected strategy
  const parser = new Parser({ parserStrategy: zone.parserMode })

  const perfTracker = createPerformanceTracker()
  zone.perfTracker = perfTracker

  perfTracker.start()

  // Parse phase (no caching - each zone parses independently for fair comparison)
  const parseStart = performance.now()
  const svga = await parser.load(url)
  const parseTime = performance.now() - parseStart

  // Create renderer instances based on selected mode
  function createRenderers(): IRenderer[] {
    switch (zone.rendererMode) {
      case 'webgpu':
        return [new WebGPURenderer(), new CanvasRenderer()]
      case 'webgl':
        return [new WebGLRenderer(), new CanvasRenderer()]
      case 'canvas':
        return [new CanvasRenderer()]
      case 'auto':
      default:
        return [new WebGPURenderer(), new WebGLRenderer(), new CanvasRenderer()]
    }
  }

  // Mount phase
  const mountStart = performance.now()
  const players: Player[] = []

  for (let i = 0; i < canvases.length; i++) {
    const player = new Player({
      container: canvases[i],
      loop: 0,
      renderers: createRenderers()
    })
    player.onProcess = () => {
      perfTracker.tick()
    }
    await player.mount(svga)
    players.push(player)
  }

  const mountTime = performance.now() - mountStart
  zone.players = players

  // Update frame slider max value
  if (players.length > 0 && players[0].totalFrames > 0) {
    const frameSlider = zone.element.querySelector(
      '.zone-frame-slider'
    ) as HTMLInputElement
    const frameDisplay = zone.element.querySelector(
      '.zone-frame-display'
    ) as HTMLSpanElement
    if (frameSlider) {
      frameSlider.max = String(players[0].totalFrames - 1)
      frameSlider.value = '0'
    }
    if (frameDisplay) {
      frameDisplay.textContent = `0 / ${players[0].totalFrames - 1}`
    }
  }

  // Start all players
  players.forEach((p) => p.start())

  // Wait for FPS to stabilize
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const statsData = perfTracker.getStats()
  const fps = Math.round(perfTracker.getFPS())

  return {
    parseTime,
    mountTime,
    totalTime: parseTime + mountTime,
    fps,
    frameTimeAvg: statsData.avg,
    frameTimeMin: statsData.min,
    frameTimeMax: statsData.max,
    frameTimeVariance: statsData.variance,
    instanceCount: count
  }
}

// Run original version benchmark
async function runOriginalVersionBenchmark(
  zone: TestZone,
  url: string,
  count: number,
  canvasContainer: HTMLDivElement
): Promise<BenchmarkResult> {
  if (!window.SVGA) {
    log(`[Zone ${zone.id}] Original SVGA not loaded from CDN`, 'error')
    return {
      parseTime: 0,
      mountTime: 0,
      totalTime: 0,
      fps: 0,
      frameTimeAvg: 0,
      frameTimeMin: 0,
      frameTimeMax: 0,
      frameTimeVariance: 0,
      instanceCount: count
    }
  }

  const canvases = createCanvases(canvasContainer, count)
  const perfTracker = createPerformanceTracker()
  zone.perfTracker = perfTracker

  perfTracker.start()

  // Parse phase
  const parseStart = performance.now()
  const parsers: any[] = []
  const svgas: any[] = []

  for (let i = 0; i < count; i++) {
    const parser = new window.SVGA.Parser()
    const svga = await parser.load(url)
    parsers.push(parser)
    svgas.push(svga)
  }
  const parseTime = performance.now() - parseStart

  // Mount phase
  const mountStart = performance.now()
  const players: any[] = []

  for (let i = 0; i < count; i++) {
    const player = new window.SVGA.Player(canvases[i])
    player.onProcess = () => {
      perfTracker.tick()
    }
    await player.mount(svgas[i])
    players.push(player)
  }

  const mountTime = performance.now() - mountStart
  zone.players = players

  // Update frame slider max value
  if (players.length > 0 && players[0].totalFrames > 0) {
    const frameSlider = zone.element.querySelector(
      '.zone-frame-slider'
    ) as HTMLInputElement
    const frameDisplay = zone.element.querySelector(
      '.zone-frame-display'
    ) as HTMLSpanElement
    if (frameSlider) {
      frameSlider.max = String(players[0].totalFrames - 1)
      frameSlider.value = '0'
    }
    if (frameDisplay) {
      frameDisplay.textContent = `0 / ${players[0].totalFrames - 1}`
    }
  }

  // Start all players
  players.forEach((p) => p.start())

  // Cleanup parsers
  parsers.forEach((p) => p.destroy())

  // Wait for FPS to stabilize
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const statsData = perfTracker.getStats()
  const fps = Math.round(perfTracker.getFPS())

  return {
    parseTime,
    mountTime,
    totalTime: parseTime + mountTime,
    fps,
    frameTimeAvg: statsData.avg,
    frameTimeMin: statsData.min,
    frameTimeMax: statsData.max,
    frameTimeVariance: statsData.variance,
    instanceCount: count
  }
}

// Stop a test zone (destroy players but keep results)
function stopTestZone(id: number) {
  const zone = testZones.get(id)
  if (!zone) return

  // Destroy all players
  zone.players.forEach((player) => {
    try {
      player.destroy()
    } catch (_e) {
      /* ignore */
    }
  })
  zone.players = []
  zone.perfTracker = null
  zone.isRunning = false
  zone.element.classList.remove('running')

  const runBtn = zone.element.querySelector(
    '.zone-run-btn'
  ) as HTMLButtonElement
  const stopBtn = zone.element.querySelector(
    '.zone-stop-btn'
  ) as HTMLButtonElement
  runBtn.style.display = ''
  stopBtn.style.display = 'none'

  // Clear canvas container
  const canvasContainer = zone.element.querySelector(
    '.zone-canvas-container'
  ) as HTMLDivElement
  canvasContainer.innerHTML = ''

  log(`[Zone ${id}] Stopped (results preserved)`, 'info')
}

// Remove a test zone
function removeTestZone(id: number) {
  const zone = testZones.get(id)
  if (!zone) return

  // Stop first if running
  if (zone.isRunning) {
    stopTestZone(id)
  }

  zone.element.remove()
  testZones.delete(id)
  log(`Removed Test Zone ${id}`, 'info')
}

// Update zone metrics display
function updateZoneMetrics(zone: TestZone, result: BenchmarkResult) {
  const parseTimeEl = zone.element.querySelector('.zone-parse-time')
  const mountTimeEl = zone.element.querySelector('.zone-mount-time')
  const totalTimeEl = zone.element.querySelector('.zone-total-time')
  const fpsEl = zone.element.querySelector('.zone-fps')

  if (parseTimeEl) parseTimeEl.textContent = `${result.parseTime.toFixed(0)}ms`
  if (mountTimeEl) mountTimeEl.textContent = `${result.mountTime.toFixed(0)}ms`
  if (totalTimeEl) totalTimeEl.textContent = `${result.totalTime.toFixed(0)}ms`
  if (fpsEl) fpsEl.textContent = `${result.fps}`

  const frameAvgEl = zone.element.querySelector('.zone-frame-avg')
  const frameMinMaxEl = zone.element.querySelector('.zone-frame-minmax')
  const frameVarEl = zone.element.querySelector('.zone-frame-var')

  if (frameAvgEl) frameAvgEl.textContent = `${result.frameTimeAvg.toFixed(2)}ms`
  if (frameMinMaxEl)
    frameMinMaxEl.textContent = `${result.frameTimeMin.toFixed(2)} / ${result.frameTimeMax.toFixed(2)}`
  if (frameVarEl)
    frameVarEl.textContent = `${result.frameTimeVariance.toFixed(2)}`
}

// Clear all test zones
function clearAll() {
  testZones.forEach((zone) => {
    if (zone.isRunning) {
      stopTestZone(zone.id)
    }
    zone.element.remove()
  })
  testZones.clear()
  assetManager.clear()
  log('Cleared all test zones', 'info')
}

// ==================== Phase 2: WASM Parser Benchmark ====================

// DOM elements - Phase 2
const wasmStatusDot = document.getElementById(
  'wasmStatusDot'
) as HTMLSpanElement
const wasmStatusText = document.getElementById(
  'wasmStatusText'
) as HTMLSpanElement
const wasmSvgaFile = document.getElementById(
  'wasmSvgaFile'
) as HTMLSelectElement
const wasmIterations = document.getElementById(
  'wasmIterations'
) as HTMLInputElement
const runWasmBenchmarkBtn = document.getElementById(
  'runWasmBenchmark'
) as HTMLButtonElement
const wasmLogEl = document.getElementById('wasmLog') as HTMLDivElement
const wasmComparisonBody = document.getElementById(
  'wasmComparisonBody'
) as HTMLTableSectionElement
const speedupDisplay = document.getElementById(
  'speedupDisplay'
) as HTMLDivElement
const speedupValue = document.getElementById('speedupValue') as HTMLDivElement

// WASM metrics
const wasmMetrics = {
  parseTime: document.getElementById('wasmParseTime') as HTMLDivElement,
  parseMin: document.getElementById('wasmParseMin') as HTMLDivElement,
  parseMax: document.getElementById('wasmParseMax') as HTMLDivElement,
  parseStatus: document.getElementById('wasmParseStatus') as HTMLDivElement
}

const jsMetrics = {
  parseTime: document.getElementById('jsParseTime') as HTMLDivElement,
  parseMin: document.getElementById('jsParseMin') as HTMLDivElement,
  parseMax: document.getElementById('jsParseMax') as HTMLDivElement,
  parseStatus: document.getElementById('jsParseStatus') as HTMLDivElement
}

// State - Phase 2
let isWasmRunning = false

// Note: WASM is NOT pre-initialized for fair benchmark comparison.
// Both WASM and JS will include their initialization time in the first iteration.

// Run WASM parser benchmark
async function runWasmParserBenchmark(
  url: string,
  iterations: number
): Promise<ParserBenchmarkResult> {
  // Reset wasmParser to force true cold start (includes WASM download + compile)
  getWasmParser().destroy()

  const times: number[] = []
  const parser = new Parser({ parserStrategy: 'wasm' })

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    await parser.load(url)

    const elapsed = performance.now() - start
    times.push(elapsed)

    // First iteration includes WASM initialization time
    if (i === 0) {
      log(
        `[WASM] Iteration 1 (includes WASM init): ${elapsed.toFixed(2)}ms`,
        'info',
        wasmLogEl
      )
    } else {
      log(
        `[WASM] Iteration ${i + 1}: ${elapsed.toFixed(2)}ms`,
        'info',
        wasmLogEl
      )
    }
  }

  parser.destroy()

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  // Log first iteration separately as it includes WASM load time
  if (times.length > 1) {
    const avgWithoutFirst =
      times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1)
    log(
      `[WASM] First iteration (with init): ${times[0].toFixed(2)}ms, Avg (without first): ${avgWithoutFirst.toFixed(2)}ms`,
      'success',
      wasmLogEl
    )
  }

  return { times, avg, min, max }
}

// Run JS parser benchmark
async function runJsParserBenchmark(
  url: string,
  iterations: number
): Promise<ParserBenchmarkResult> {
  const times: number[] = []
  const parser = new Parser({ parserStrategy: 'js' })

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    await parser.load(url)

    const elapsed = performance.now() - start
    times.push(elapsed)

    log(`[JS] Iteration ${i + 1}: ${elapsed.toFixed(2)}ms`, 'info', wasmLogEl)
  }

  parser.destroy()

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  return { times, avg, min, max }
}

// Update WASM comparison table
function updateWasmComparisonTable(
  wasmResult: ParserBenchmarkResult,
  jsResult: ParserBenchmarkResult
) {
  const speedup = (jsTime: number, wasmTime: number) => {
    if (wasmTime === 0) return '-'
    return `${(jsTime / wasmTime).toFixed(2)}x`
  }

  const rows = [
    {
      metric: 'Avg Parse Time',
      wasm: `${wasmResult.avg.toFixed(1)}ms`,
      js: `${jsResult.avg.toFixed(1)}ms`,
      speedup: speedup(jsResult.avg, wasmResult.avg),
      wasmWins: wasmResult.avg < jsResult.avg
    },
    {
      metric: 'Min Parse Time',
      wasm: `${wasmResult.min.toFixed(1)}ms`,
      js: `${jsResult.min.toFixed(1)}ms`,
      speedup: speedup(jsResult.min, wasmResult.min),
      wasmWins: wasmResult.min < jsResult.min
    },
    {
      metric: 'Max Parse Time',
      wasm: `${wasmResult.max.toFixed(1)}ms`,
      js: `${jsResult.max.toFixed(1)}ms`,
      speedup: speedup(jsResult.max, wasmResult.max),
      wasmWins: wasmResult.max < jsResult.max
    }
  ]

  wasmComparisonBody.innerHTML = rows
    .map(
      (row) => `
    <tr>
      <td>${row.metric}</td>
      <td class="${row.wasmWins ? 'winner' : 'loser'}">${row.wasm}</td>
      <td class="${row.wasmWins ? 'loser' : 'winner'}">${row.js}</td>
      <td style="color: #4ade80">${row.speedup}</td>
    </tr>
  `
    )
    .join('')

  // Update speedup display
  const avgSpeedup = jsResult.avg / wasmResult.avg
  speedupValue.textContent = `${avgSpeedup.toFixed(2)}x`
  speedupDisplay.style.display = 'block'
}

// Main WASM benchmark runner
async function runWasmBenchmark() {
  if (isWasmRunning) return

  isWasmRunning = true
  runWasmBenchmarkBtn.disabled = true
  runWasmBenchmarkBtn.textContent = '⏳ Running...'
  wasmLogEl.innerHTML = ''

  const url = wasmSvgaFile.value
  const iterations = parseInt(wasmIterations.value, 10)

  log(
    `Starting parser benchmark: ${iterations} iterations of ${url}`,
    'info',
    wasmLogEl
  )

  try {
    // Run WASM benchmark
    log('[WASM] Starting parser benchmark...', 'info', wasmLogEl)
    const wasmResult = await runWasmParserBenchmark(url, iterations)
    wasmMetrics.parseTime.textContent = `${wasmResult.avg.toFixed(1)}ms`
    wasmMetrics.parseMin.textContent = `${wasmResult.min.toFixed(1)}ms`
    wasmMetrics.parseMax.textContent = `${wasmResult.max.toFixed(1)}ms`
    wasmMetrics.parseStatus.textContent = '✓'
    wasmMetrics.parseStatus.className = 'metric-value good'
    log(
      `[WASM] Complete! Avg: ${wasmResult.avg.toFixed(2)}ms`,
      'success',
      wasmLogEl
    )

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Run JS benchmark
    log('[JS] Starting parser benchmark...', 'info', wasmLogEl)
    const jsResult = await runJsParserBenchmark(url, iterations)
    jsMetrics.parseTime.textContent = `${jsResult.avg.toFixed(1)}ms`
    jsMetrics.parseMin.textContent = `${jsResult.min.toFixed(1)}ms`
    jsMetrics.parseMax.textContent = `${jsResult.max.toFixed(1)}ms`
    jsMetrics.parseStatus.textContent = '✓'
    jsMetrics.parseStatus.className = 'metric-value good'
    log(
      `[JS] Complete! Avg: ${jsResult.avg.toFixed(2)}ms`,
      'success',
      wasmLogEl
    )

    // Update comparison
    updateWasmComparisonTable(wasmResult, jsResult)

    const speedup = jsResult.avg / wasmResult.avg
    log(
      `🚀 WASM is ${speedup.toFixed(2)}x faster than JS!`,
      'success',
      wasmLogEl
    )
  } catch (error) {
    log(`Error: ${error}`, 'error', wasmLogEl)
    console.error(error)
  } finally {
    isWasmRunning = false
    runWasmBenchmarkBtn.disabled = false
    runWasmBenchmarkBtn.textContent = '▶ Run Parser Benchmark'
  }
}

// ==================== Tab Navigation ====================

function initTabs() {
  const tabs = document.querySelectorAll('.tab')
  const contents = document.querySelectorAll('.tab-content')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab')

      // Update tabs
      tabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')

      // Update content
      contents.forEach((c) => {
        if (c.id === targetId) {
          c.classList.add('active')
        } else {
          c.classList.remove('active')
        }
      })
    })
  })
}

// ==================== Initialize ====================

// Event listeners - Phase 1
addTestZoneBtn.addEventListener('click', createTestZone)
clearAllBtn.addEventListener('click', clearAll)
runWasmBenchmarkBtn.addEventListener('click', runWasmBenchmark)

// Initialize tabs
initTabs()

// WASM status - will be updated after first benchmark run
wasmStatusDot.className = 'dot loading'
wasmStatusText.textContent = 'WASM will initialize on first benchmark'

log('Benchmark ready. Click "+ Add Test Zone" to start.', 'info')
