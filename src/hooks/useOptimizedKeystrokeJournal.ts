import { useRef, useEffect, useCallback } from 'react';
import { RundownState } from './useRundownState';
import { usePerCellSaveFeatureFlag } from './usePerCellSaveFeatureFlag';

interface OptimizedKeystrokeEntry {
  timestamp: number;
  type: 'typing' | 'edit';
  itemId?: string;
  fieldName?: string;
}

interface UseOptimizedKeystrokeJournalProps {
  rundownId: string | null;
  state: RundownState;
  enabled?: boolean;
}

/**
 * Optimized Keystroke Journal for per-cell save users
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Minimal memory footprint
 * - No snapshot storage (not needed with per-cell saves)
 * - Field-level tracking only
 * - Automatic cleanup
 * - Disabled entirely for test users (not needed)
 */
export const useOptimizedKeystrokeJournal = ({ 
  rundownId, 
  state, 
  enabled = true 
}: UseOptimizedKeystrokeJournalProps) => {
  const { isPerCellSaveEnabled } = usePerCellSaveFeatureFlag();
  const journalRef = useRef<OptimizedKeystrokeEntry[]>([]);
  const lastPersistRef = useRef<number>(0);
  
  // For per-cell save users, keystroke journaling is not needed
  // The per-cell save system provides better granular tracking
  const isJournalEnabled = enabled && !isPerCellSaveEnabled;

  // Lightweight journal management
  const addJournalEntry = useCallback((entry: OptimizedKeystrokeEntry) => {
    if (!isJournalEnabled) return;
    
    journalRef.current.push(entry);
    
    // Keep only last 20 entries to prevent memory bloat
    if (journalRef.current.length > 20) {
      journalRef.current = journalRef.current.slice(-20);
    }
  }, [isJournalEnabled]);

  // Record typing activity
  const recordTyping = useCallback((itemId?: string, fieldName?: string) => {
    if (!isJournalEnabled) return;
    
    addJournalEntry({
      timestamp: Date.now(),
      type: 'typing',
      itemId,
      fieldName
    });
  }, [isJournalEnabled, addJournalEntry]);

  // Record edit completion
  const recordEdit = useCallback((itemId?: string, fieldName?: string) => {
    if (!isJournalEnabled) return;
    
    addJournalEntry({
      timestamp: Date.now(),
      type: 'edit',
      itemId,
      fieldName
    });
  }, [isJournalEnabled, addJournalEntry]);

  // Lightweight persistence (optional)
  const persistJournal = useCallback(() => {
    if (!isJournalEnabled || !rundownId) return;
    
    const now = Date.now();
    if (now - lastPersistRef.current < 10000) return; // Throttle to every 10 seconds
    
    try {
      const journalData = {
        rundownId,
        entries: journalRef.current.slice(-10), // Only persist last 10 entries
        persistedAt: now
      };
      
      localStorage.setItem(`journal-${rundownId}`, JSON.stringify(journalData));
      lastPersistRef.current = now;
    } catch (error) {
      console.warn('Failed to persist keystroke journal:', error);
    }
  }, [isJournalEnabled, rundownId]);

  // Clear journal
  const clearJournal = useCallback(() => {
    journalRef.current = [];
    if (rundownId) {
      localStorage.removeItem(`journal-${rundownId}`);
    }
  }, [rundownId]);

  // Get journal stats
  const getJournalStats = useCallback(() => {
    if (!isJournalEnabled) {
      return {
        entryCount: 0,
        typingEvents: 0,
        editEvents: 0,
        memoryUsage: 0,
        enabled: false
      };
    }
    
    const entries = journalRef.current;
    return {
      entryCount: entries.length,
      typingEvents: entries.filter(e => e.type === 'typing').length,
      editEvents: entries.filter(e => e.type === 'edit').length,
      memoryUsage: JSON.stringify(entries).length,
      enabled: true
    };
  }, [isJournalEnabled]);

  // Auto-cleanup on rundown change
  useEffect(() => {
    if (!isJournalEnabled) {
      clearJournal();
    }
  }, [rundownId, isJournalEnabled, clearJournal]);

  // Disable all functionality for per-cell save users
  if (isPerCellSaveEnabled) {
    return {
      recordTyping: () => {}, // No-op
      recordEdit: () => {}, // No-op
      persistJournal: () => {}, // No-op
      clearJournal: () => {}, // No-op
      getJournalStats: () => ({
        entryCount: 0,
        typingEvents: 0,
        editEvents: 0,
        memoryUsage: 0,
        enabled: false,
        disabled: 'Per-cell save users do not need keystroke journaling'
      }),
      latestSnapshot: null,
      getLatestSnapshot: () => null,
      hasUnsavedContent: false
    };
  }

  return {
    recordTyping,
    recordEdit,
    persistJournal,
    clearJournal,
    getJournalStats,
    latestSnapshot: null, // Not used in optimized version
    getLatestSnapshot: () => null, // Not used in optimized version
    hasUnsavedContent: false // Not tracked in optimized version
  };
};
