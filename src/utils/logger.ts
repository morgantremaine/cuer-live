
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  isDevelopment: boolean;
  enableConsoleLogging: boolean;
  enableErrorReporting: boolean;
  logLevel: LogLevel;
  enableBlueprintDebug: boolean;
  enableRundownDebug: boolean;
  debugEmails: string[];
}

const config: LoggerConfig = {
  isDevelopment: import.meta.env.DEV,
  enableConsoleLogging: false, // Will be overridden by user email check
  enableErrorReporting: import.meta.env.PROD,
  logLevel: 'debug', // Allow all levels when enabled
  enableBlueprintDebug: false,
  enableRundownDebug: false,
  debugEmails: [
    'morgantremaine@gmail.com',
    'morgan@cuer.live', 
    'morgantremaine@me.com',
    'cuertest@gmail.com'
  ]
};

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Global user email for logging access control
let currentUserEmail: string | null = null;

export const setLoggerUserEmail = (email: string | null) => {
  currentUserEmail = email;
};

const shouldLog = (level: LogLevel): boolean => {
  // Check if current user is in debug emails list
  const isDebugUser = currentUserEmail && config.debugEmails.includes(currentUserEmail);
  
  // Only allow logging for debug users - ignore localStorage and other flags
  return isDebugUser && LOG_LEVELS[level] <= LOG_LEVELS[config.logLevel];
};

const formatMessage = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    return `${prefix} ${message} - ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
};

// Production-ready logging utility with minimal console noise
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
  },

  // Specialized loggers for specific domains
  blueprint: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `🔷 BLUEPRINT: ${message}`, data);
    console.debug(formattedMessage);
  },

  rundown: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📋 RUNDOWN: ${message}`, data);
    console.debug(formattedMessage);
  },

  // Enhanced domain-specific loggers with emoji prefixes
  realtime: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📡 REALTIME: ${message}`, data);
    console.debug(formattedMessage);
  },

  autosave: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `💾 AUTOSAVE: ${message}`, data);
    console.debug(formattedMessage);
  },

  team: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `👥 TEAM: ${message}`, data);
    console.debug(formattedMessage);
  },

  grid: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📊 GRID: ${message}`, data);
    console.debug(formattedMessage);
  },

  focus: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `🎯 FOCUS: ${message}`, data);
    console.debug(formattedMessage);
  },

  sync: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `🔄 SYNC: ${message}`, data);
    console.debug(formattedMessage);
  },

  teleprompter: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📝 TELEPROMPTER: ${message}`, data);
    console.debug(formattedMessage);
  },

  auth: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `🔐 AUTH: ${message}`, data);
    console.debug(formattedMessage);
  },

  broadcast: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📢 BROADCAST: ${message}`, data);
    console.debug(formattedMessage);
  },

  showcaller: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📱 SHOWCALLER: ${message}`, data);
    console.debug(formattedMessage);
  },

  monitor: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `📺 MONITOR: ${message}`, data);
    console.debug(formattedMessage);
  },

  security: (message: string, data?: any) => {
    if (!shouldLog('debug')) return;
    
    const formattedMessage = formatMessage('debug', `🔒 SECURITY: ${message}`, data);
    console.debug(formattedMessage);
  }
};

// Override global console methods to filter ALL console output
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

const isLoggingAllowed = (): boolean => {
  const isDebugUser = currentUserEmail && config.debugEmails.includes(currentUserEmail);
  return isDebugUser;
};

// Override console methods
console.log = (...args: any[]) => {
  if (isLoggingAllowed()) {
    originalConsole.log(...args);
  }
};

console.warn = (...args: any[]) => {
  if (isLoggingAllowed()) {
    originalConsole.warn(...args);
  }
};

console.error = (...args: any[]) => {
  if (isLoggingAllowed()) {
    originalConsole.error(...args);
  }
};

console.info = (...args: any[]) => {
  if (isLoggingAllowed()) {
    originalConsole.info(...args);
  }
};

console.debug = (...args: any[]) => {
  if (isLoggingAllowed()) {
    originalConsole.debug(...args);
  }
};
