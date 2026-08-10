import { MockWebWorker } from './types'

declare global {
  interface Window {
    SVGAParserMockWorker: undefined | MockWebWorker
  }
}

// Vite asset imports
declare module '*.wasm?url' {
  const src: string
  export default src
}
