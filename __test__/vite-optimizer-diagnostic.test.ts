import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('Vite optimizer development integration diagnostic', () => {
  it.each([
    [
      'Vite 5',
      'http://localhost:5173/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=v5'
    ],
    [
      'Vite 6 with a base path',
      'http://localhost:5173/app/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=v6'
    ],
    [
      'Vite 7 with a hash',
      'https://example.test/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=v7#module'
    ],
    [
      'Vite 8',
      'http://127.0.0.1:4173/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=v8'
    ]
  ])(
    'recognizes the supported %s optimizer URL shape',
    async (_, moduleUrl) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { reportViteOptimizerIntegrationDiagnostic } =
        await import('../src/vite-optimizer-diagnostic')

      reportViteOptimizerIntegrationDiagnostic(moduleUrl)

      expect(error).toHaveBeenCalledOnce()
    }
  )

  it('reports actionable configuration once for an optimized module', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { reportViteOptimizerIntegrationDiagnostic } =
      await import('../src/vite-optimizer-diagnostic')
    const optimizedModuleUrl =
      'http://localhost:5173/node_modules/.vite/deps/@hagoss_svga-web-player.js?v=abc123#module'
    const optimizedWorkerUrl =
      'http://localhost:5173/node_modules/.vite/deps/parser-worker.iife.js'

    reportViteOptimizerIntegrationDiagnostic(optimizedModuleUrl)
    reportViteOptimizerIntegrationDiagnostic(optimizedWorkerUrl)

    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0].join(' ')).toContain('@hagoss/svga-web-player')
    expect(error.mock.calls[0].join(' ')).toContain('optimizeDeps.exclude')
    expect(error.mock.calls[0].join(' ')).toContain('--force')
  })

  it.each([
    'http://localhost:5173/src/main.ts',
    'http://localhost:5173/node_modules/@hagoss/svga-web-player/dist/index.mjs',
    'http://localhost:5173/cache/deps/@hagoss_svga-web-player.js',
    'http://localhost:5173/node_modules/.vite/deps-other/@hagoss_svga-web-player.js',
    'not a URL'
  ])('does not misdiagnose a non-optimizer module at %s', async (moduleUrl) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { reportViteOptimizerIntegrationDiagnostic } =
      await import('../src/vite-optimizer-diagnostic')

    reportViteOptimizerIntegrationDiagnostic(moduleUrl)

    expect(error).not.toHaveBeenCalled()
  })

  it.each(['debug', 'log', 'warn', 'error', 'none'] as const)(
    'stays visible at the %s Player log level',
    async (logLevel) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const [{ reportViteOptimizerIntegrationDiagnostic }, { setLogLevel }] =
        await Promise.all([
          import('../src/vite-optimizer-diagnostic'),
          import('../src/logger')
        ])
      setLogLevel(logLevel)

      reportViteOptimizerIntegrationDiagnostic(
        'http://localhost:5173/app/node_modules/.vite/deps/@hagoss_svga-web-player.js'
      )

      expect(error).toHaveBeenCalledOnce()
    }
  )

  it('cannot replace parser behavior when console output throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console unavailable')
    })
    const { reportViteOptimizerIntegrationDiagnostic } =
      await import('../src/vite-optimizer-diagnostic')
    const moduleUrl =
      'http://localhost:5173/node_modules/.vite/deps/@hagoss_svga-web-player.js'

    expect(() =>
      reportViteOptimizerIntegrationDiagnostic(moduleUrl)
    ).not.toThrow()
    expect(() =>
      reportViteOptimizerIntegrationDiagnostic(moduleUrl)
    ).not.toThrow()
    expect(error).toHaveBeenCalledOnce()
  })

  it('starts a fresh diagnostic state with a fresh page module', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const moduleUrl =
      'http://localhost:5173/node_modules/.vite/deps/@hagoss_svga-web-player.js'
    const firstModule = await import('../src/vite-optimizer-diagnostic')

    firstModule.reportViteOptimizerIntegrationDiagnostic(moduleUrl)
    vi.resetModules()
    const freshModule = await import('../src/vite-optimizer-diagnostic')
    freshModule.reportViteOptimizerIntegrationDiagnostic(moduleUrl)

    expect(error).toHaveBeenCalledTimes(2)
  })
})
