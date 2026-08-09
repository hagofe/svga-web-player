/**
 * 日志模块
 * 默认 tag: [svga-player]
 * 默认级别: warn
 */

export type LogLevel = 'debug' | 'log' | 'warn' | 'error' | 'none'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  warn: 2,
  error: 3,
  none: 4
}

class Logger {
  private level: LogLevel = 'warn'
  private readonly tag = '[svga-player]'

  setLogLevel(level: LogLevel): void {
    this.level = level
  }

  debug(...args: any[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.debug(this.tag, ...args)
    }
  }

  log(...args: any[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.log) {
      console.log(this.tag, ...args)
    }
  }

  warn(...args: any[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(this.tag, ...args)
    }
  }

  error(...args: any[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      console.error(this.tag, ...args)
    }
  }
}

export const logger = new Logger()

export const setLogLevel = (level: LogLevel): void => {
  logger.setLogLevel(level)
}
