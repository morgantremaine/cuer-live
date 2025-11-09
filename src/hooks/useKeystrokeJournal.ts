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
  
  // MEMORY CRISIS: Disable journal entirely for large rundowns to prevent memory leaks
  const itemCount = state.items?.length || 0;
  const MAX_JOURNAL_ENTRIES = itemCount > 50 ? 0 : itemCount > 30 ? 5 : 20; // Disable for large rundowns
  const PERSIST_INTERVAL_MS = performanceMode ? 30000 : 10000; // Much less frequent
  
  // Memory usage monitoring - much more aggressive
  const memoryUsageRef = useRef<number>(0);
  const MEMORY_WARNING_THRESHOLD = 50 * 1024 * 1024; // 50MB - aggressive threshold

  // Performance-optimized signature creation with caching and lightweight mode
  const createSnapshotSignature = useCallback((snapshot: RundownState) => {
    const cacheKey = `${snapshot.items?.length || 0}-${snapshot.title || ''}-${Date.now()}`;
    
    // Check cache first
    if (signatureCache.current.has(cacheKey)) {
      return signatureCache.current.get(cacheKey)!;
    }
    
    let signature: string;
    
    // MEMORY OPTIMIZED: Always use ultra-lightweight signatures
    signature = JSON.stringify({
      itemCount: snapshot.items?.length || 0,
      itemIds: snapshot.items?.slice(0, 3).map(item => item.id) || [], // Only first 3 items
      title: (snapshot.title || '').substring(0, 50), // Truncate long titles
      startTime: snapshot.startTime || '',
      contentHash: (snapshot.items?.length || 0) + (snapshot.title?.length || 0) // Simple hash
    });
    
    // Aggressive cache limit for memory efficiency
    if (signatureCache.current.size > 10) {
      signatureCache.current.clear(); // Clear cache if too large
    }
    signatureCache.current.set(cacheKey, signature);
    
    return signature;
  }, [performanceMode, itemCount]);

  // Performance-optimized journal entry management with memory monitoring
  const addJournalEntry = useCallback((entry: KeystrokeEntry) => {
    if (!enabled || !rundownId) return;
    
    // MEMORY CRISIS: Skip journal entirely for large rundowns
    if (MAX_JOURNAL_ENTRIES === 0) return;
    
    journalRef.current.push(entry);
    
    // Performance-aware ring buffer management
    if (journalRef.current.length > MAX_JOURNAL_ENTRIES) {
      const keepEntries = Math.floor(MAX_JOURNAL_ENTRIES * 0.5); // Keep only 50%
      journalRef.current = journalRef.current.slice(-keepEntries);
      
      if (performanceMode) {
        console.log('🧹 Journal: Performance cleanup, kept', keepEntries, 'entries');
      }
    }

    if (verboseLoggingRef.current) {
      console.log('📝 Keystroke journal:', entry);
    }
  }, [enabled, rundownId, MAX_JOURNAL_ENTRIES, performanceMode]);

  // Update latest snapshot and log the change - MEMORY OPTIMIZED
  const updateSnapshot = useCallback((description: string = 'content update') => {
    if (!enabled || !rundownId || !state) return;

    // MEMORY CRISIS: Don't create full snapshots for large rundowns
    if (itemCount > 100) {
      // Only track minimal metadata for large rundowns
      addJournalEntry({
        timestamp: Date.now(),
        type: 'snapshot',
        contentLength: itemCount * 50, // Estimated size
        itemCount,
        description: description + ' (minimal)'
      });
      return;
    }

    const previousSnapshot = latestSnapshotRef.current;
    // CRITICAL: Don't deep copy large states - just reference for small rundowns
    latestSnapshotRef.current = itemCount < 50 ? { ...state } : state;
    
    const contentLength = itemCount * 100; // Estimate instead of expensive signature
    
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
        // Silent - no logging needed for item count changes
      }
    }

    // Auto-persist less frequently
    const now = Date.now();
    if (now - lastPersistedRef.current > PERSIST_INTERVAL_MS) {
      persistJournal();
      lastPersistedRef.current = now;
    }
  }, [enabled, rundownId, state, itemCount, addJournalEntry]);

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
        entries: journalRef.current.slice(-20), // Keep only last 20 entries for memory
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

  // Auto-update snapshot when state changes - debounced for performance
  useEffect(() => {
    if (!enabled || !state || !rundownId) return;
    
    const debounceTimer = setTimeout(() => {
      updateSnapshot('state change');
    }, 300); // Debounce snapshot updates during rapid typing
    
    return () => clearTimeout(debounceTimer);
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
      // Content access - return null for large rundowns to prevent memory leaks
      latestSnapshot: itemCount > 100 ? null : latestSnapshotRef.current,
      getLatestSnapshot: () => itemCount > 100 ? null : latestSnapshotRef.current,
      
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
      hasUnsavedContent: itemCount > 100 ? false : !!latestSnapshotRef.current
    };
};
