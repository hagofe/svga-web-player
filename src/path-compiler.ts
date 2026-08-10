/**
 * SVG Path Pre-compiler
 *
 * Converts SVG path strings (e.g., "M 0 0 L 10 10") to pre-compiled
 * drawing commands to eliminate regex parsing during render loops.
 */

/**
 * Drawing command opcodes
 */
export const enum DrawOp {
  M = 0, // moveTo absolute
  m = 1, // moveTo relative
  L = 2, // lineTo absolute
  l = 3, // lineTo relative
  H = 4, // horizontal lineTo absolute
  h = 5, // horizontal lineTo relative
  V = 6, // vertical lineTo absolute
  v = 7, // vertical lineTo relative
  C = 8, // bezierCurveTo absolute
  c = 9, // bezierCurveTo relative
  S = 10, // smooth bezierCurveTo absolute
  s = 11, // smooth bezierCurveTo relative
  Q = 12, // quadraticCurveTo absolute
  q = 13, // quadraticCurveTo relative
  Z = 14 // closePath
}

/**
 * Pre-compiled drawing command
 * Format: [opcode, ...numeric_args]
 */
export type DrawCmd = [op: number, ...args: number[]]

/**
 * Compiled path interface
 */
export interface CompiledPath {
  commands: DrawCmd[]
}

const VALID_METHODS = 'MLHVCSQRZmlhvcsqrz'

const OP_MAP: { [key: string]: number } = {
  M: DrawOp.M,
  m: DrawOp.m,
  L: DrawOp.L,
  l: DrawOp.l,
  H: DrawOp.H,
  h: DrawOp.h,
  V: DrawOp.V,
  v: DrawOp.v,
  C: DrawOp.C,
  c: DrawOp.c,
  S: DrawOp.S,
  s: DrawOp.s,
  Q: DrawOp.Q,
  q: DrawOp.q,
  Z: DrawOp.Z,
  z: DrawOp.Z
}

/**
 * Compile an SVG path string to an array of drawing commands.
 * This function should be called at load time, not render time.
 *
 * @param d - SVG path string (e.g., "M 0 0 L 10 10 Z")
 * @returns Array of pre-compiled drawing commands
 */
export function compilePath(d: string | undefined): DrawCmd[] {
  if (d === undefined || d.length === 0) {
    return []
  }

  const commands: DrawCmd[] = []

  // Split path into segments by command letters
  // Replace command letters with delimiter + letter for splitting
  const normalized = d.replace(/([a-zA-Z])/g, '|||$1 ').replace(/,/g, ' ')
  const segments = normalized.split('|||')

  for (const segment of segments) {
    if (segment.length === 0) continue

    const method = segment.charAt(0)
    if (!VALID_METHODS.includes(method)) continue

    const opcode = OP_MAP[method]
    if (opcode === undefined) continue

    // Parse numeric arguments
    const argsStr = segment.substring(1).trim()
    const args: number[] = []

    if (argsStr.length > 0) {
      const argParts = argsStr.split(/\s+/)
      for (const part of argParts) {
        if (part.length > 0) {
          const num = parseFloat(part)
          if (!isNaN(num)) {
            args.push(num)
          }
        }
      }
    }

    commands.push([opcode, ...args] as DrawCmd)
  }

  return commands
}

/**
 * Check if a path has been compiled
 */
export function isCompiled(path: {
  d?: string
  commands?: DrawCmd[]
}): boolean {
  return path.commands !== undefined && path.commands.length > 0
}
