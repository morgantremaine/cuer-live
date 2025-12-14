import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { createContentSignature } from '@/utils/contentSignature';
import { debugLogger } from '@/utils/debugLogger';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';
import { toast } from 'sonner';

interface FieldUpdate {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

// Fields that should save quickly (non-typing interactions like dropdowns/pickers)
const QUICK_SAVE_FIELDS = ['timezone', 'startTime', 'endTime', 'showDate', 'title'];
const QUICK_SAVE_DELAY = 300; // 300ms for quick-save fields

export const useCellLevelSave = (
  rundownId: string | null,
  onSaveComplete?: (savedUpdates?: FieldUpdate[], completionCount?: number) => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  onChangesSaved?: () => void,
  isTypingActive?: () => boolean,
  saveInProgressRef?: React.MutableRefObject<boolean>,
  typingIdleMs?: number,
  onSaveError?: (error: string) => void
) => {
  const pendingUpdatesRef = useRef<FieldUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const failedSavesRef = useRef<FieldUpdate[]>([]);
  const wasOfflineRef = useRef(false);
  const saveCompletionCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryAttemptRef = useRef(0);
  const firstTypingTimeRef = useRef<number>(0);
  
  // localStorage keys for persistence
  const getStorageKey = useCallback(() => {
    return rundownId ? `rundown_failed_saves_${rundownId}` : null;
  }, [rundownId]);
  
  // Persist failed saves to localStorage
  const persistFailedSaves = useCallback(() => {
    const key = getStorageKey();
    if (!key) return;
    
    try {
      if (failedSavesRef.current.length > 0) {
        localStorage.setItem(key, JSON.stringify(failedSavesRef.current));
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to persist failed saves to localStorage:', error);
    }
  }, [getStorageKey]);
  
  // Load failed saves from localStorage on mount
  useEffect(() => {
    const key = getStorageKey();
    if (!key) return;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsedSaves = JSON.parse(stored) as FieldUpdate[];
        if (parsedSaves.length > 0) {
          failedSavesRef.current = parsedSaves;
          console.log(`📂 Loaded ${parsedSaves.length} failed saves from previous session`);
          
          // Show toast and trigger immediate retry
          toast.info(`Found ${parsedSaves.length} unsaved change${parsedSaves.length === 1 ? '' : 's'} from previous session`, {
            description: 'Retrying now...'
          });
          
          // Trigger retry after a short delay to let the UI settle
          setTimeout(() => {
            retryFailedSaves();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to load failed saves from localStorage:', error);
    }
  }, [rundownId]); // Only run on mount or rundownId change

  // Track individual field changes
  const trackCellChange = useCallback((itemId: string | undefined, field: string, value: any) => {
    if (!rundownId) return;

    const update: FieldUpdate = {
      itemId,
      field,
      value,
      timestamp: Date.now()
    };

    pendingUpdatesRef.current.push(update);
    
    if (onUnsavedChanges) {
      onUnsavedChanges();
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const scheduleTypingAwareSave = () => {
      // Use quick delay for non-typing fields, normal delay for content fields
      const isQuickSaveField = QUICK_SAVE_FIELDS.includes(field);
      const delay = isQuickSaveField ? QUICK_SAVE_DELAY : (typingIdleMs || 1500);
      
      // Track first typing timestamp for max timeout
      if (!isQuickSaveField && !firstTypingTimeRef.current) {
        firstTypingTimeRef.current = Date.now();
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        // Skip typing check for quick-save fields
        if (!isQuickSaveField && isTypingActive && isTypingActive()) {
          // Force save after 10 seconds of continuous typing to prevent indefinite postponement
          const typingDuration = Date.now() - (firstTypingTimeRef.current || 0);
          if (typingDuration > 10000) {
            console.log('⏱️ Forcing save after 10 seconds of typing');
            firstTypingTimeRef.current = 0;
            savePendingUpdates();
            return;
          }
          scheduleTypingAwareSave();
          return;
        }
        
        if (saveInProgressRef && saveInProgressRef.current) {
          scheduleTypingAwareSave();
          return;
        }
        
        firstTypingTimeRef.current = 0;
        savePendingUpdates();
      }, delay);
    };

    scheduleTypingAwareSave();
  }, [rundownId]);

  // Save pending updates to database via edge function
  const savePendingUpdates = useCallback(async () => {
    if (!rundownId || pendingUpdatesRef.current.length === 0) {
      return;
    }

    // Track save-in-progress for health check coordination
    simpleConnectionHealth.setSaveInProgress(rundownId, true);

    const updatesToSave = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = [];

    try {
      debugLogger.autosave(`Saving ${updatesToSave.length} cell-level updates`);

      if (onSaveStart) {
        onSaveStart();
      }

      const contentSignature = createContentSignature({
        items: [],
        title: '',
        showDate: null,
        externalNotes: ''
      });

      // Validate auth session before save
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Session check failed - user may need to log in again:', sessionError);
        
        // If no session, store updates as failed and retry later
        failedSavesRef.current.push(...updatesToSave);
        persistFailedSaves();
        
        const errorMsg = 'Session expired. Please refresh the page.';
        onSaveError?.(errorMsg);
        toast.error('Save Failed', {
          description: errorMsg
        });
        
        // Clear the shared saveInProgress flag
        if (saveInProgressRef) {
          saveInProgressRef.current = false;
        }
        
        // Don't clear pending updates - keep them for retry
        scheduleRetry();
        return;
      }
      
      // Refresh token if expiring soon (< 5 minutes)
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt - now < 300) {
        console.log('🔄 Cell-level save: Token expiring soon - refreshing');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          throw new Error('Token refresh failed');
        }
      }

      const { data, error } = await saveWithTimeout(
        () => supabase.functions.invoke('cell-field-save', {
          body: {
            rundownId,
            fieldUpdates: updatesToSave,
            contentSignature,
            baselineDocVersion: undefined, // Not used for online saves
            baselineTimestamp: undefined
          }
        }),
        'per-cell-save',
        20000
      );

      if (error) {
        console.error('Per-cell save error:', error);
        
        // Store failed saves separately for retry on reconnection
        failedSavesRef.current.push(...updatesToSave);
        persistFailedSaves(); // Persist to localStorage immediately
        
        // Notify UI of unsaved changes so user knows there's an issue
        if (onUnsavedChanges) {
          onUnsavedChanges();
        }
        
        // Provide specific error feedback
        const errorMessage = error.message?.includes('timeout') 
          ? 'Save timeout - will retry automatically'
          : error.message?.includes('NetworkError')
          ? 'Network error - will retry when online'
          : 'Save failed - will retry automatically';
        
        if (onSaveError) {
          onSaveError(errorMessage);
        }
        
        // Schedule auto-retry with exponential backoff
        scheduleRetry();
        
        // Error already handled - stored for retry, UI notified, retry scheduled
        return;
      }

      if (data?.success) {
        debugLogger.autosave(`Cell-level save successful: ${data.fieldsUpdated} fields`);
        
        if (data.updatedAt) {
          const context = rundownId ? `realtime-${rundownId}` : undefined;
          ownUpdateTracker.track(data.updatedAt, context);
        }
        
        // Increment completion counter for reliable UI updates
        saveCompletionCountRef.current += 1;
        
        if (onChangesSaved) {
          onChangesSaved();
        }
        
        if (onSaveComplete) {
          onSaveComplete(updatesToSave, saveCompletionCountRef.current);
        }
        
        // Clear save-in-progress flag on success
        simpleConnectionHealth.setSaveInProgress(rundownId, false);
        
        return {
          updatedAt: data.updatedAt,
          docVersion: data.docVersion
        };
      } else {
        // Store failed saves for retry
        failedSavesRef.current.push(...updatesToSave);
        persistFailedSaves(); // Persist to localStorage immediately
        if (onUnsavedChanges) {
          onUnsavedChanges();
        }
        const errorMsg = 'Save failed. Will retry automatically.';
        if (onSaveError) {
          onSaveError(errorMsg);
        }
        
        // Only show toast if max retries exceeded
        if (retryAttemptRef.current >= 3) {
          toast.error('Save Failed', {
            description: 'Unable to save changes after multiple attempts.'
          });
        }
        scheduleRetry();
        return;
      }

    } catch (error) {
      console.error('Per-cell save exception:', error);
      
      // CRITICAL: Persist failed saves instead of re-throwing
      // This ensures offline edits survive page refresh
      failedSavesRef.current.push(...updatesToSave);
      persistFailedSaves();
      
      if (onUnsavedChanges) {
        onUnsavedChanges();
      }
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Save failed - will retry automatically';
      
      if (onSaveError) {
        onSaveError(errorMessage);
      }
      
      // Schedule retry for when network is back
      scheduleRetry();
      
      // Clear the shared saveInProgress flag
      if (saveInProgressRef) {
        saveInProgressRef.current = false;
      }
    }
  }, [rundownId, onSaveError, onUnsavedChanges]);

  // Schedule retry with exponential backoff (30s, 60s, 120s, then stop)
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    const delays = [30000, 60000, 120000]; // 30s, 60s, 120s
    const delay = delays[Math.min(retryAttemptRef.current, delays.length - 1)];
    
    if (retryAttemptRef.current < 3) {
      console.log(`⏱️ Scheduling retry attempt ${retryAttemptRef.current + 1} in ${delay / 1000}s`);
      retryTimeoutRef.current = setTimeout(() => {
        retryAttemptRef.current++;
        retryFailedSaves();
      }, delay);
    } else {
      console.log('⚠️ Max retry attempts reached - manual retry required');
    }
  }, []);
  
  const clearRetrySchedule = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
    retryAttemptRef.current = 0;
  }, []);

  // Retry failed saves when connection is restored
  const retryFailedSaves = useCallback(async () => {
    if (failedSavesRef.current.length === 0) {
      return;
    }

    console.log('🔄 Retrying', failedSavesRef.current.length, 'failed saves');
    
    const savesToRetry = [...failedSavesRef.current];
    failedSavesRef.current = [];
    
    // Add them to pending updates for normal save flow
    pendingUpdatesRef.current.push(...savesToRetry);
    
    try {
      // Trigger immediate save
      await savePendingUpdates();
      // Clear retry schedule on success
      clearRetrySchedule();
      persistFailedSaves(); // Clear from localStorage on success
      console.log('✅ Retry successful');
    } catch (error) {
      console.error('❌ Retry failed:', error);
      // Failed saves will be re-added to failedSavesRef by savePendingUpdates
      persistFailedSaves(); // Update localStorage with current failed saves
    }
  }, [savePendingUpdates, clearRetrySchedule, persistFailedSaves]);

  // Monitor browser network status for reconnection
  useEffect(() => {
    const handleOnline = () => {
      if (wasOfflineRef.current) {
        console.log('📶 Network restored - retrying failed saves');
        wasOfflineRef.current = false;
        retryFailedSaves();
      }
    };
    
    const handleOffline = () => {
      console.log('📵 Network offline - saves will be queued');
      wasOfflineRef.current = true;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryFailedSaves]);
  
  // Monitor auth state for session expiration
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.error('🔐 Auth state changed - session expired');
        if (onSaveError) {
          onSaveError('Session expired - please refresh page');
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [onSaveError]);

  // Force immediate save of all pending updates
  const flushPendingUpdates = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    return await savePendingUpdates();
  }, [savePendingUpdates]);

  // Check if there are pending updates
  const hasPendingUpdates = useCallback(() => {
    return pendingUpdatesRef.current.length > 0;
  }, []);

  // Add beforeunload handler to prevent data loss on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingUpdates()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        
        // Best-effort synchronous flush
        flushPendingUpdates().catch(console.error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingUpdates, flushPendingUpdates]);

  // Add visibilitychange handler to prevent data loss from background tab throttling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && hasPendingUpdates()) {
        debugLogger.autosave('Tab hidden - flushing cell-level saves immediately');
        flushPendingUpdates().catch(console.error);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasPendingUpdates, flushPendingUpdates]);

  // Get count of failed saves for UI display
  const getFailedSavesCount = useCallback(() => {
    return failedSavesRef.current.length;
  }, []);

  return {
    trackCellChange,
    flushPendingUpdates,
    hasPendingUpdates,
    retryFailedSaves,
    getFailedSavesCount
  };
};