import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Determine log level based on environment
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'http';

// Define the format for the logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: winston.Logform.TransformableInfo) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define the transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/all.log',
    level: 'debug',
  }),
  
  // File transport for error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level,
  levels,
  format,
  transports,
});

// Export for TypeScript
export default logger;
