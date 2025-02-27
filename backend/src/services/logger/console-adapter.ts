// backend/src/services/logger/console-adapter.ts
import { Logger, LogContext } from './types';

/**
 * Adapter class that implements the Logger interface from types.ts
 */
export class ConsoleLoggerAdapter implements Logger {
  private readonly serviceName = 'ConsoleAdapter';
  
  // Renamed parameter to avoid shadowing the global console object
  constructor(private consoleObj = globalThis.console) {}
  
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${this.serviceName}]: ${message}${contextStr}`;
  }
  
  debug(message: string, context?: LogContext): void {
    this.consoleObj.debug(this.formatMessage('debug', message, context));
  }
  
  info(message: string, context?: LogContext): void {
    this.consoleObj.info(this.formatMessage('info', message, context));
  }
  
  warn(message: string, context?: LogContext): void {
    this.consoleObj.warn(this.formatMessage('warn', message, context));
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack
      }
    } : context;
    
    this.consoleObj.error(this.formatMessage('error', message, errorContext));
  }
}