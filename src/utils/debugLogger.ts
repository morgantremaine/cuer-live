interface DebugConfig {
  autosave: boolean;
  realtime: boolean;
  team: boolean;
  grid: boolean;
  focus: boolean;
  preferences: boolean;
  all: boolean;
}

const getDebugConfig = (): DebugConfig => {
  if (typeof window === 'undefined') return { autosave: false, realtime: false, team: false, grid: false, focus: false, preferences: false, all: false };
  
  const debugValue = localStorage.getItem('debugLogs');
  const all = debugValue === '1' || debugValue === 'true';
  
  return {
    autosave: all || localStorage.getItem('debugAutosave') === '1',
    realtime: all || localStorage.getItem('debugRealtime') === '1', 
    team: all || localStorage.getItem('debugTeam') === '1',
    grid: all || localStorage.getItem('debugGrid') === '1',
    focus: all || localStorage.getItem('debugFocus') === '1',
    preferences: all || localStorage.getItem('debugPreferences') === '1',
    all
  };
};

export const debugLogger = {
  autosave: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.autosave) {
      console.log(`💾 ${message}`, data ? data : '');
    }
  },
  
  realtime: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.realtime) {
      console.log(`📡 ${message}`, data ? data : '');
    }
  },
  
  team: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.team) {
      console.log(`🔄 ${message}`, data ? data : '');
    }
  },
  
  grid: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.grid) {
      console.log(`🎯 ${message}`, data ? data : '');
    }
  },
  
  focus: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.focus) {
      console.log(`🛡️ ${message}`, data ? data : '');
    }
  },
  
  preferences: (message: string, data?: any) => {
    const config = getDebugConfig();
    if (config.preferences) {
      console.log(`🔄 ${message}`, data ? data : '');
    }
  },
  
  // Always shown - for critical debugging
  critical: (message: string, data?: any) => {
    console.log(`🚨 ${message}`, data ? data : '');
  },
  
  // Always shown - for errors
  error: (message: string, data?: any) => {
    console.error(`❌ ${message}`, data ? data : '');
  }
};

// Helper to enable all debug logging
export const enableDebugLogs = () => {
  localStorage.setItem('debugLogs', '1');
  console.log('🔧 Debug logging enabled. Refresh to see all logs.');
};

// Helper to disable all debug logging  
export const disableDebugLogs = () => {
  localStorage.removeItem('debugLogs');
  localStorage.removeItem('debugAutosave');
  localStorage.removeItem('debugRealtime');
  localStorage.removeItem('debugTeam');
  localStorage.removeItem('debugGrid');
  localStorage.removeItem('debugFocus');
  localStorage.removeItem('debugPreferences');
  console.log('🔧 Debug logging disabled. Refresh to clean up logs.');
};

// Make helpers available globally for development
if (typeof window !== 'undefined') {
  (window as any).enableDebugLogs = enableDebugLogs;
  (window as any).disableDebugLogs = disableDebugLogs;
}