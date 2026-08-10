import { IRenderer, RendererInitOptions } from '../../../types'

// Re-export types from central location
export type { IRenderer, RendererInitOptions }

// Alias for backward compatibility within renderer implementations
export type RendererOptions = RendererInitOptions
