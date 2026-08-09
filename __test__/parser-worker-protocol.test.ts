import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fixtureBuffer = readFileSync(
  new URL('./svga/kaola.svga', import.meta.url)
)

class FakeXMLHttpRequest {
  public response: ArrayBuffer | undefined
  public status = 200
  public statusText = 'OK'
  public responseType: XMLHttpRequestResponseType = ''
  public onloadend: ((event: ProgressEvent) => void) | null = null

  open(): void {}

  send(): void {
    this.response = fixtureBuffer.buffer.slice(
      fixtureBuffer.byteOffset,
      fixtureBuffer.byteOffset + fixtureBuffer.byteLength
    )
    this.onloadend?.({} as ProgressEvent)
  }
}

describe('parser Worker protocol', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('reports response serialization failure as a channel failure', async () => {
    const responses: any[] = []
    const workerScope = {
      onmessage: undefined as
        | ((event: { data: Record<string, unknown> }) => Promise<void>)
        | undefined,
      postMessage: vi.fn((response: any) => {
        responses.push(response)
        if (response.ok) throw new Error('DataCloneError')
      })
    }
    vi.stubGlobal('self', workerScope)
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)

    await import('../src/parser/index')
    await workerScope.onmessage?.({
      data: {
        requestId: 7,
        url: 'https://example.com/fixture.svga',
        options: { isDisableImageBitmapShim: true }
      }
    })

    expect(responses).toHaveLength(2)
    expect(responses[1]).toEqual({
      requestId: 7,
      ok: false,
      failureKind: 'channel',
      error: '[SVGA Parser Channel Error] DataCloneError'
    })
  })
})
