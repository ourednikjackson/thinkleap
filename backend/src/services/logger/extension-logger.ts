// backend/src/services/logger/extension-logger.ts
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { LoggerService, ILogger } from './logger.service';
import { LogContext, LogLevel } from './types';

const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * ExtensionLogger provides file-based logging specifically for extension testing
 * Extends the base LoggerService with additional file logging capabilities
 */
export class ExtensionLogger extends LoggerService implements ILogger {
  private logDir: string;
  private logFile: string;
  private logEnabled: boolean = true;
  
  constructor(
    serviceName: string = 'ExtensionTesting',
    logDir: string = './logs/extension'
  ) {
    super();
    this.logDir = path.resolve(process.env.LOG_DIR || logDir);
    this.logFile = path.join(this.logDir, 'extension-testing.log');
    this.initLogDirectory();
  }
  
  private async initLogDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.logDir)) {
        await mkdirAsync(this.logDir, { recursive: true });
      }
      
      // Create or truncate log file on startup
      const timestamp = new Date().toISOString();
      const header = `=== EXTENSION TESTING LOG STARTED AT ${timestamp} ===\n`;
      await writeFileAsync(this.logFile, header);
    } catch (error) {
      console.error('Failed to initialize extension log file:', error);
      this.logEnabled = false;
    }
  }
  
  private async writeToLogFile(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    if (!this.logEnabled) return;
    
    try {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` ${JSON.stringify(context, null, 2)}` : '';
      const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}\n`;
      
      await appendFileAsync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to extension log file:', error);
      // Disable file logging if there's an error to prevent further attempts
      this.logEnabled = false;
    }
  }
  
  // Override base logger methods to add file logging
  debug(message: string, context?: LogContext): void {
    super.debug(message, context); // Log to console
    void this.writeToLogFile('debug', message, context); // Log to file
  }
  
  info(message: string, context?: LogContext): void {
    super.info(message, context); // Log to console
    void this.writeToLogFile('info', message, context); // Log to file
  }
  
  warn(message: string, context?: LogContext): void {
    super.warn(message, context); // Log to console
    void this.writeToLogFile('warn', message, context); // Log to file
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    super.error(message, error, context); // Log to console
    
    const errorContext = error ? {
      ...context,
      error: {
        message: error.message,
        stack: error.stack
      }
    } : context;
    
    void this.writeToLogFile('error', message, errorContext); // Log to file
  }
  
  /**
   * Log detailed information about an API request specific to extension testing
   */
  logRequest(req: any): void {
    const requestData = {
      method: req.method,
      url: req.originalUrl,
      headers: {
        ...req.headers,
        // Mask sensitive headers
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined
      },
      query: req.query,
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : undefined
    };
    
    this.info('Extension API request received', { request: requestData });
  }
  
  /**
   * Log response details for extension testing
   */
  logResponse(status: number, body: any): void {
    this.info('Extension API response sent', {
      response: {
        status,
        body
      }
    });
  }
}

export default ExtensionLogger;