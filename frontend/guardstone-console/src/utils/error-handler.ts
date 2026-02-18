/**
 * Error Handler
 * Centralized error handling and logging
 */

type ErrorLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  timestamp?: string
  [key: string]: any
}

interface LogEntry {
  level: ErrorLevel
  message: string
  context?: ErrorContext
  stack?: string
  timestamp: string
}

class ErrorHandler {
  private static logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info'
  private static logs: LogEntry[] = []
  private static maxLogs = 1000

  private static isEnabled = (level: ErrorLevel): boolean => {
    const levels: ErrorLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
    const currentLevelIndex = levels.indexOf(this.logLevel as ErrorLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  /**
   * Log a message
   */
  static log(level: ErrorLevel, message: string, context?: ErrorContext) {
    if (!this.isEnabled(level)) return

    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    }

    // Store log in memory
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const style = this.getConsoleStyle(level)
      console.log(`%c[${level.toUpperCase()}]`, style, message, context)
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternal(logEntry)
    }
  }

  /**
   * Debug level logging
   */
  static debug(message: string, context?: ErrorContext) {
    this.log('debug', message, context)
  }

  /**
   * Info level logging
   */
  static info(message: string, context?: ErrorContext) {
    this.log('info', message, context)
  }

  /**
   * Warning level logging
   */
  static warn(message: string, context?: ErrorContext) {
    this.log('warn', message, context)
  }

  /**
   * Error level logging
   */
  static error(message: string, error?: Error, context?: ErrorContext) {
    const logEntry: LogEntry = {
      level: 'error',
      message,
      context,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error, context)
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendToExternal(logEntry)
    }
  }

  /**
   * Fatal error logging
   */
  static fatal(message: string, error?: Error, context?: ErrorContext) {
    const logEntry: LogEntry = {
      level: 'fatal',
      message,
      context,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(logEntry)

    if (process.env.NODE_ENV === 'production') {
      this.sendToExternal(logEntry)
    }

    console.error(`[FATAL] ${message}`, error, context)
  }

  /**
   * Get all logs
   */
  static getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Clear logs
   */
  static clearLogs() {
    this.logs = []
  }

  /**
   * Get console style for log level
   */
  private static getConsoleStyle(level: ErrorLevel): string {
    const styles: Record<ErrorLevel, string> = {
      debug: 'color: #888; font-weight: bold;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold;',
      fatal: 'color: #990000; font-weight: bold; background: #ffcccc;',
    }
    return styles[level]
  }

  /**
   * Send log to external service
   */
  private static async sendToExternal(logEntry: LogEntry) {
    try {
      // Send to Sentry, LogRocket, or other service
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // Implement Sentry integration
      }
    } catch (err) {
      // Silently fail to avoid infinite loops
      console.error('Failed to send log to external service', err)
    }
  }
}

export default ErrorHandler
