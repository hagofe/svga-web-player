import { IRenderer, RendererOptions } from '../shared/types'

export class WebGPURenderer implements IRenderer {
  name = 'webgpu' as const

  async init(_options: RendererOptions): Promise<void> {
    // WebGPU renderer is not yet implemented
    // Throw error to trigger fallback to next renderer in strategy
    throw new Error('WebGPU renderer not yet implemented')
  }

  prepare(): void {
    // Resize logic
  }

  clear(): void {
    // Clear logic
  }

  drawFrame(_frame: number): void {
    // Draw logic
  }

  destroy(): void {
    // Cleanup
  }
}
