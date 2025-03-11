// Simple logger utility for frontend
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Default to info in production, debug in development
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const currentLogLevel = logLevels[(process.env.LOG_LEVEL as LogLevel) || defaultLogLevel as LogLevel] || logLevels.info;

export const logger = {
  error: (message: string, ...args: any[]) => {
    if (logLevels.error <= currentLogLevel) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (logLevels.warn <= currentLogLevel) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (logLevels.info <= currentLogLevel) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (logLevels.debug <= currentLogLevel) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
