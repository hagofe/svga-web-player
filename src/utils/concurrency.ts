/**
 * Concurrency Control Utilities
 *
 * Shared utilities for limiting concurrent async operations.
 */

/**
 * Default concurrency limit for image decoding.
 * Balanced between speed and memory safety.
 */
export const DEFAULT_IMAGE_DECODE_CONCURRENCY = 6

/**
 * Execute an async function on each item with limited concurrency.
 *
 * @param items - Array of items to process
 * @param fn - Async function to execute on each item
 * @param limit - Maximum concurrent executions (default: 4)
 * @returns Promise that resolves when all items are processed
 *
 * @example
 * ```ts
 * await mapWithConcurrency(imageKeys, async (key) => {
 *   const bitmap = await createImageBitmap(blobs[key])
 *   images[key] = bitmap
 * }, 4)
 * ```
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number = DEFAULT_IMAGE_DECODE_CONCURRENCY
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const p = fn(item).then((result) => {
      results.push(result)
    })

    executing.push(p)

    if (executing.length >= limit) {
      await Promise.race(executing)
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if promise is settled by racing with an immediate resolve
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false)
        ])
        if (settled) {
          executing.splice(i, 1)
        }
      }
    }
  }

  // Wait for remaining
  await Promise.all(executing)
  return results
}

/**
 * Execute async functions with limited concurrency (simpler version).
 * This version doesn't preserve order but is more efficient.
 *
 * @param items - Array of items to process
 * @param fn - Async function to execute on each item
 * @param limit - Maximum concurrent executions
 */
export async function forEachWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number = DEFAULT_IMAGE_DECODE_CONCURRENCY
): Promise<void> {
  const queue = [...items]
  const workers: Promise<void>[] = []

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item !== undefined) {
        await fn(item)
      }
    }
  }

  // Spawn workers up to the limit
  const numWorkers = Math.min(limit, items.length)
  for (let i = 0; i < numWorkers; i++) {
    workers.push(worker())
  }

  await Promise.all(workers)
}
