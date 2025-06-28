
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  isDevelopment: boolean;
  enableConsoleLogging: boolean;
  enableErrorReporting: boolean;
  logLevel: LogLevel;
}

const config: LoggerConfig = {
  isDevelopment: import.meta.env.DEV,
  enableConsoleLogging: import.meta.env.DEV,
  enableErrorReporting: import.meta.env.PROD,
  logLevel: import.meta.env.DEV ? 'debug' : 'error'
};

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] <= LOG_LEVELS[config.logLevel];
};

const formatMessage = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    return `${prefix} ${message} - ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
};

// Enhanced logging utility with proper production handling
export const logger = {
  error: (message: string, data?: any) => {
    if (!shouldLog('error')) return;
    
    const formattedMessage = formatMessage('error', message, data);
    
    if (config.enableConsoleLogging) {
      console.error(formattedMessage);
    }
    
    // In production, you might want to send errors to a service like Sentry
    if (config.enableErrorReporting && config.isDevelopment === false) {
      // TODO: Implement error reporting service integration
      // Example: Sentry.captureException(new Error(formattedMessage));
    }
  },
  
  warn: (message: string, data?: any) => {
    if (!shouldLog('warn')) return;
    
    const formattedMessage = formatMessage('warn', message, data);
    
    if (config.enableConsoleLogging) {
      console.warn(formattedMessage);
    }
  },
  
  info: (message: string, data?: any) => {
    if (!shouldLog('info')) return;
    
    const formattedMessage = formatMessage('info', message, data);
    
    if (config.enableConsoleLogging) {
      console.info(formattedMessage);
    }
  },
  
  log: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', message, data);
    
    if (config.enableConsoleLogging) {
      console.log(formattedMessage);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', message, data);
    
    if (config.enableConsoleLogging) {
      console.debug(formattedMessage);
    }
  }
};
