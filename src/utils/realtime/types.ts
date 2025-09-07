// Simplified realtime synchronization types

export interface RealtimeUpdate {
  id: string;
  timestamp: string;
  docVersion: number;
  tabId?: string;
  userId?: string;
  type: 'content' | 'showcaller' | 'blueprint';
}

export interface SyncState {
  isConnected: boolean;
  lastSyncTime: string | null;
  isProcessing: boolean;
}

export interface ContentUpdate {
  items?: any[];
  title?: string;
  startTime?: string;
  timezone?: string;
  externalNotes?: any;
  showDate?: string;
}

export interface ShowcallerUpdate {
  showcallerState: any;
}

export interface FieldProtection {
  fieldKey: string;
  protectedUntil: number;
}

// Single source of truth configuration
export const SYNC_CONFIG = {
  // Typing protection window (milliseconds)
  TYPING_PROTECTION_WINDOW: 3000,
  
  // Autosave debounce delay
  AUTOSAVE_DELAY: 2000,
  
  // Connection status check interval
  HEARTBEAT_INTERVAL: 30000,
  
  // Tab ID for echo prevention
  TAB_ID_KEY: 'simplified_tab_id'
} as const;