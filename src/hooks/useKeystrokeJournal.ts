import { useRef, useCallback, useEffect } from 'react';
import { RundownState } from './useRundownState';

interface KeystrokeEntry {
  timestamp: number;
  type: 'typing' | 'edit' | 'snapshot';
  contentLength?: number;
  itemCount?: number;
  description?: string;
}

interface UseKeystrokeJournalProps {
  rundownId: string | null;
  state: RundownState;
  enabled?: boolean;
  performanceMode?: boolean; // Enable memory-optimized mode for large rundowns
}

/**
 * Keystroke journal hook for tracking user edits and maintaining latest content snapshot.
 * Provides reliable source-of-truth for save operations and debugging lost characters.
 */
export const useKeystrokeJournal = ({ rundownId, state, enabled = true, performanceMode = false }: UseKeystrokeJournalProps) => {
  const latestSnapshotRef = useRef<RundownState | null>(null);
  const journalRef = useRef<KeystrokeEntry[]>([]);
  const lastPersistedRef = useRef<number>(0);
  const verboseLoggingRef = useRef(false);
  const signatureCache = useRef<Map<string, string>>(new Map());
  
  // Performance-aware ring buffer sizing based on rundown size
  const itemCount = state.items?.length || 0;
  const MAX_JOURNAL_ENTRIES = performanceMode || itemCount > 150 ? 500 : itemCount > 100 ? 750 : 1000;
  const PERSIST_INTERVAL_MS = performanceMode ? 5000 : 3000; // Less frequent persistence for large rundowns
  
  // Memory usage monitoring
  const memoryUsageRef = useRef<number>(0);
  const MEMORY_WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB

  // Performance-optimized signature creation with caching and lightweight mode
  const createSnapshotSignature = useCallback((snapshot: RundownState) => {
    const cacheKey = `${snapshot.items?.length || 0}-${snapshot.title || ''}-${Date.now()}`;
    
    // Check cache first
    if (signatureCache.current.has(cacheKey)) {
      return signatureCache.current.get(cacheKey)!;
    }
    
    let signature: string;
    
    // Use lightweight signature for performance mode or large rundowns
    if (performanceMode || itemCount > 150) {
      signature = JSON.stringify({
        itemCount: snapshot.items?.length || 0,
        itemIds: snapshot.items?.slice(0, 10).map(item => item.id) || [], // Sample first 10 items
        title: snapshot.title || '',
        startTime: snapshot.startTime || '',
        contentHash: snapshot.items?.reduce((acc, item, idx) => 
          acc + (item.name?.length || 0) + (item.script?.length || 0) + idx, 0) || 0
      });
    } else {
      // Full signature for smaller rundowns
      signature = JSON.stringify({
        items: snapshot.items?.map(item => ({
          id: item.id,
          name: item.name || '',
          script: item.script || '',
          notes: item.notes || '',
          talent: item.talent || ''
        })) || [],
        title: snapshot.title || '',
        startTime: snapshot.startTime || '',
        timezone: snapshot.timezone || '',
        externalNotes: snapshot.externalNotes || ''
      });
    }
    
    // Cache with size limit
    if (signatureCache.current.size > 50) {
      signatureCache.current.clear(); // Clear cache if too large
    }
    signatureCache.current.set(cacheKey, signature);
    
    return signature;
  }, [performanceMode, itemCount]);

  // Performance-optimized journal entry management with memory monitoring
  const addJournalEntry = useCallback((entry: KeystrokeEntry) => {
    if (!enabled || !rundownId) return;
    
    journalRef.current.push(entry);
    
    // Performance-aware ring buffer management
    if (journalRef.current.length > MAX_JOURNAL_ENTRIES) {
      const keepEntries = Math.floor(MAX_JOURNAL_ENTRIES * 0.8); // Keep 80% when cleaning
      journalRef.current = journalRef.current.slice(-keepEntries);
      
      if (performanceMode) {
        console.log('🧹 Journal: Performance cleanup, kept', keepEntries, 'entries');
      }
    }
    
    // Memory usage estimation and warning
    if (performanceMode && journalRef.current.length % 100 === 0) {
      try {
        const estimatedSize = JSON.stringify(journalRef.current).length * 2; // Rough estimate
        memoryUsageRef.current = estimatedSize;
        
        if (estimatedSize > MEMORY_WARNING_THRESHOLD) {
          console.warn('⚠️ Journal memory usage high:', Math.round(estimatedSize / 1024 / 1024), 'MB');
          // More aggressive cleanup for memory pressure
          journalRef.current = journalRef.current.slice(-Math.floor(MAX_JOURNAL_ENTRIES * 0.5));
        }
      } catch (error) {
        // Ignore memory calculation errors
      }
    }

    if (verboseLoggingRef.current) {
      console.log('📝 Keystroke journal:', entry);
    }
  }, [enabled, rundownId, MAX_JOURNAL_ENTRIES, performanceMode]);

  // Update latest snapshot and log the change
  const updateSnapshot = useCallback((description: string = 'content update') => {
    if (!enabled || !rundownId || !state) return;

    const previousSnapshot = latestSnapshotRef.current;
    latestSnapshotRef.current = { ...state };
    
    const itemCount = state.items?.length || 0;
    const contentLength = createSnapshotSignature(state).length;
    
    addJournalEntry({
      timestamp: Date.now(),
      type: 'snapshot',
      contentLength,
      itemCount,
      description
    });

    // Log significant changes
    if (previousSnapshot) {
      const prevItemCount = previousSnapshot.items?.length || 0;
      const itemDiff = itemCount - prevItemCount;
      
      if (Math.abs(itemDiff) > 0) {
        console.log(`📊 Journal: ${description} - items changed by ${itemDiff} (${prevItemCount} → ${itemCount})`);
      }
    }

    // Auto-persist every few seconds
    const now = Date.now();
    if (now - lastPersistedRef.current > PERSIST_INTERVAL_MS) {
      persistJournal();
      lastPersistedRef.current = now;
    }
  }, [enabled, rundownId, state, createSnapshotSignature, addJournalEntry]);

  // Track typing activity - don't auto-update snapshot to prevent cascade
  const recordTyping = useCallback((description: string = 'typing activity') => {
    if (!enabled || !rundownId) return;

    addJournalEntry({
      timestamp: Date.now(),
      type: 'typing',
      description
    });

    // Don't auto-update snapshot on typing to prevent save cascades
    // Snapshot will be updated when state actually changes via useEffect
  }, [enabled, rundownId, addJournalEntry]);

  // Record edit operations (structural changes)
  const recordEdit = useCallback((description: string) => {
    if (!enabled || !rundownId) return;

    addJournalEntry({
      timestamp: Date.now(),
      type: 'edit',
      description
    });

    updateSnapshot(description);
  }, [enabled, rundownId, addJournalEntry, updateSnapshot]);

  // Persist journal to localStorage for debugging and recovery
  const persistJournal = useCallback(() => {
    if (!enabled || !rundownId || journalRef.current.length === 0) return;

    try {
      const journalData = {
        rundownId,
        entries: journalRef.current.slice(-100), // Keep last 100 entries
        lastSnapshot: latestSnapshotRef.current ? createSnapshotSignature(latestSnapshotRef.current) : null,
        persistedAt: Date.now()
      };

      localStorage.setItem(`keystroke_journal_${rundownId}`, JSON.stringify(journalData));
      
      if (verboseLoggingRef.current) {
        console.log('💾 Journal persisted:', { 
          entries: journalData.entries.length,
          lastEntry: journalData.entries[journalData.entries.length - 1]
        });
      }
    } catch (error) {
      console.error('❌ Failed to persist keystroke journal:', error);
    }
  }, [enabled, rundownId, createSnapshotSignature]);

  // Load journal from localStorage on mount
  const loadJournal = useCallback(() => {
    if (!enabled || !rundownId) return;

    try {
      const stored = localStorage.getItem(`keystroke_journal_${rundownId}`);
      if (stored) {
        const journalData = JSON.parse(stored);
        journalRef.current = journalData.entries || [];
        console.log('📂 Loaded journal:', { entries: journalRef.current.length });
      }
    } catch (error) {
      console.error('❌ Failed to load keystroke journal:', error);
    }
  }, [enabled, rundownId]);

  // Get statistics for debugging
  const getJournalStats = useCallback(() => {
    const now = Date.now();
    const recent = journalRef.current.filter(entry => now - entry.timestamp < 60000); // Last minute
    const typingEvents = recent.filter(entry => entry.type === 'typing').length;
    const editEvents = recent.filter(entry => entry.type === 'edit').length;

    return {
      totalEntries: journalRef.current.length,
      recentEntries: recent.length,
      typingEventsLastMinute: typingEvents,
      editEventsLastMinute: editEvents,
      eventsPerSecond: recent.length / 60,
      latestSnapshot: latestSnapshotRef.current,
      hasUnsavedSnapshot: !!latestSnapshotRef.current
    };
  }, []);

  // Enable/disable verbose logging
  const setVerboseLogging = useCallback((verbose: boolean) => {
    verboseLoggingRef.current = verbose;
    console.log(`🔊 Keystroke journal verbose logging: ${verbose ? 'enabled' : 'disabled'}`);
  }, []);

  // Clear journal and snapshot
  const clearJournal = useCallback(() => {
    journalRef.current = [];
    latestSnapshotRef.current = null;
    if (rundownId) {
      localStorage.removeItem(`keystroke_journal_${rundownId}`);
    }
    console.log('🗑️ Keystroke journal cleared');
  }, [rundownId]);

  // Auto-update snapshot when state changes
  useEffect(() => {
    if (enabled && state && rundownId) {
      updateSnapshot('state change');
    }
  }, [enabled, state, rundownId, updateSnapshot]);

  // Load journal on mount and rundown switch
  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  // Cleanup: persist final journal on unmount
  useEffect(() => {
    return () => {
      if (enabled && rundownId && journalRef.current.length > 0) {
        try {
          persistJournal();
        } catch (error) {
          console.error('❌ Failed to persist journal on unmount:', error);
        }
      }
    };
  }, [enabled, rundownId, persistJournal]);

  return {
    // Content access
    latestSnapshot: latestSnapshotRef.current,
    getLatestSnapshot: () => latestSnapshotRef.current,
    
    // Recording functions
    recordTyping,
    recordEdit,
    updateSnapshot,
    
    // Management
    persistJournal,
    clearJournal,
    getJournalStats,
    setVerboseLogging,
    
    // State
    hasUnsavedContent: !!latestSnapshotRef.current
  };
};
