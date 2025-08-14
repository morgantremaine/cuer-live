import { useEffect, useState } from 'react';

interface GlobalTeleprompterSyncState {
  isTeleprompterSaving: boolean;
  handleTeleprompterSaveStart: () => void;
  handleTeleprompterSaveEnd: () => void;
}

// Global state for teleprompter sync (singleton pattern)
let globalTeleprompterSyncState = {
  isTeleprompterSaving: false,
  subscribers: new Set<(state: boolean) => void>(),
  
  handleTeleprompterSaveStart() {
    console.log('📝 Global teleprompter save started');
    this.isTeleprompterSaving = true;
    this.subscribers.forEach(callback => callback(true));
  },
  
  handleTeleprompterSaveEnd() {
    console.log('📝 Global teleprompter save ended');
    // Add a small delay to ensure the indicator is visible
    setTimeout(() => {
      this.isTeleprompterSaving = false;
      this.subscribers.forEach(callback => callback(false));
    }, 200);
  },
  
  subscribe(callback: (state: boolean) => void) {
    this.subscribers.add(callback);
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }
};

export const useGlobalTeleprompterSync = () => {
  const [isTeleprompterSaving, setIsTeleprompterSaving] = useState(globalTeleprompterSyncState.isTeleprompterSaving);
  
  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = globalTeleprompterSyncState.subscribe(setIsTeleprompterSaving);
    return unsubscribe;
  }, []);
  
  return {
    isTeleprompterSaving,
    handleTeleprompterSaveStart: globalTeleprompterSyncState.handleTeleprompterSaveStart.bind(globalTeleprompterSyncState),
    handleTeleprompterSaveEnd: globalTeleprompterSyncState.handleTeleprompterSaveEnd.bind(globalTeleprompterSyncState)
  };
};