// backend/src/services/logger/index.ts
export * from './types';
export * from './logger.service';
export * from './extension-logger';
export { LoggerService as Logger } from './logger.service';
export { ExtensionLogger as ExtensionTestingLogger } from './extension-logger';