/**
 * Global Parse Queue
 *
 * Limits concurrent SVGA parsing operations across the entire application.
 * This prevents memory spikes when multiple SVGA files are loaded simultaneously.
 */

/**
 * Default global concurrency limit for parsing operations.
 */
export const DEFAULT_GLOBAL_PARSE_CONCURRENCY = 2

/**
 * Async Queue with configurable concurrency limit.
 * Tasks are executed in order with at most `limit` concurrent executions.
 */
export class AsyncQueue {
  private limit: number
  private running = 0
  private queue: Array<() => void> = []

  constructor(limit: number = DEFAULT_GLOBAL_PARSE_CONCURRENCY) {
    this.limit = limit
  }

  /**
   * Update the concurrency limit.
   * Takes effect for new tasks; existing running tasks are not affected.
   */
  setLimit(limit: number): void {
    this.limit = limit
    // Try to start more tasks if limit increased
    this.tryNext()
  }

  /**
   * Get current concurrency limit.
   */
  getLimit(): number {
    return this.limit
  }

  /**
   * Add a task to the queue.
   * Returns a promise that resolves when the task completes.
   */
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          this.tryNext()
        }
      }

      if (this.running < this.limit) {
        run()
      } else {
        this.queue.push(run)
      }
    })
  }

  private tryNext(): void {
    while (this.running < this.limit && this.queue.length > 0) {
      const next = this.queue.shift()
      if (next) next()
    }
  }
}

/**
 * Global shared queue for SVGA parsing operations.
 * Default limit: 2 concurrent parses.
 */
export const globalParseQueue = new AsyncQueue(DEFAULT_GLOBAL_PARSE_CONCURRENCY)
