type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'service_role_key',
  'access_token',
  'refresh_token',
  'cookie',
  'auth',
  'authorization',
])

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(sanitize)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      sanitized[k] = '[REDACTED]'
    } else if (v && typeof v === 'object') {
      sanitized[k] = sanitize(v)
    } else {
      sanitized[k] = v
    }
  }
  return sanitized
}

class Logger {
  private isProd = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const timestamp = new Date().toISOString()
    const errorDetails = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: this.isProd ? undefined : error.stack,
        }
      : error
        ? { raw: String(error) }
        : undefined

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context ? { context: sanitize(context) } : {}),
      ...(errorDetails ? { error: errorDetails } : {}),
    }

    if (this.isProd) {
      return JSON.stringify(logEntry)
    }

    // In dev: pretty readable output
    const prefix = `[${timestamp}] [${level.toUpperCase()}]:`
    const extra = context ? `\n  Context: ${JSON.stringify(sanitize(context))}` : ''
    const errStr = errorDetails ? `\n  Error: ${JSON.stringify(errorDetails)}` : ''
    return `${prefix} ${message}${extra}${errStr}`
  }

  debug(message: string, context?: LogContext) {
    if (!this.isProd) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext, error?: unknown) {
    console.warn(this.formatMessage('warn', message, context, error))
  }

  error(message: string, context?: LogContext, error?: unknown) {
    console.error(this.formatMessage('error', message, context, error))
  }

  /**
   * Translates internal/database errors into clean, safe user-facing error messages
   */
  toUserMessage(error: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
    if (!error) return fallback

    const message = error instanceof Error ? error.message : String(error)

    // Known Supabase/Postgres error codes & phrases
    if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
      return 'This item cannot be deleted because it is still referenced by other records (e.g. active jobs, properties, or invoices).'
    }
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return 'A record with this information already exists.'
    }
    if (message.includes('Invalid transition')) {
      return message
    }
    if (message.includes('not authenticated') || message.includes('Unauthorized') || message.includes('JWT')) {
      return 'Your session has expired. Please sign in again.'
    }
    if (message.includes('permission denied') || message.includes('policy')) {
      return 'You do not have permission to perform this action.'
    }

    // Return the message if it's already user-friendly, otherwise fallback
    if (message.length < 120 && !message.includes('relation') && !message.includes('column') && !message.includes('SELECT') && !message.includes('INSERT')) {
      return message
    }

    return fallback
  }
}

export const logger = new Logger()
