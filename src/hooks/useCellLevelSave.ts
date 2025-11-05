import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';
import { createContentSignature } from '@/utils/contentSignature';
import { debugLogger } from '@/utils/debugLogger';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { saveWithTimeout } from '@/utils/saveTimeout';

interface FieldUpdate {
  itemId?: string;
  field: string;
  value: any;
  timestamp: number;
}

// Fields that should save quickly (non-typing interactions like dropdowns/pickers)
const QUICK_SAVE_FIELDS = ['timezone', 'startTime', 'showDate', 'title'];
const QUICK_SAVE_DELAY = 300; // 300ms for quick-save fields

export const useCellLevelSave = (
  rundownId: string | null,
  onSaveComplete?: (savedUpdates?: FieldUpdate[], completionCount?: number) => void,
  onSaveStart?: () => void,
  onUnsavedChanges?: () => void,
  onChangesSaved?: () => void,
  isTypingActive?: () => boolean,
  saveInProgressRef?: React.MutableRefObject<boolean>,
  typingIdleMs?: number
) => {
  const pendingUpdatesRef = useRef<FieldUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const failedSavesRef = useRef<FieldUpdate[]>([]);
  const wasOfflineRef = useRef(false);
  const saveCompletionCountRef = useRef(0);

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
      
      saveTimeoutRef.current = setTimeout(() => {
        // Skip typing check for quick-save fields
        if (!isQuickSaveField && isTypingActive && isTypingActive()) {
          scheduleTypingAwareSave();
          return;
        }
        
        if (saveInProgressRef && saveInProgressRef.current) {
          scheduleTypingAwareSave();
          return;
        }
        
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
        console.error('❌ Cell-level save: Auth session invalid - re-queuing updates');
        // Re-queue updates instead of losing them
        pendingUpdatesRef.current.push(...updatesToSave);
        if (onUnsavedChanges) onUnsavedChanges();
        throw new Error('Authentication required');
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
        
        // Notify UI of unsaved changes so user knows there's an issue
        if (onUnsavedChanges) {
          onUnsavedChanges();
        }
        throw error;
      }

      if (data?.success) {
        debugLogger.autosave(`Cell-level save successful: ${data.fieldsUpdated} fields`);
        
        // ✅ Broadcast cell updates AFTER successful database save
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        
        if (rundownId && currentUserId) {
          const { cellBroadcast } = await import('@/utils/cellBroadcast');
          for (const update of updatesToSave) {
            cellBroadcast.broadcastCellUpdate(
              rundownId,
              update.itemId || undefined,
              update.field,
              update.value,
              currentUserId
            );
          }
          debugLogger.autosave(`Broadcast ${updatesToSave.length} cell updates after save`);
        }
        
        const context = rundownId ? `realtime-${rundownId}` : undefined;
        ownUpdateTracker.track(data.updatedAt, context);
        
        // Increment completion counter for reliable UI updates
        saveCompletionCountRef.current += 1;
        
        if (onChangesSaved) {
          onChangesSaved();
        }
        
        if (onSaveComplete) {
          onSaveComplete(updatesToSave, saveCompletionCountRef.current);
        }
        
        return {
          updatedAt: data.updatedAt,
          docVersion: data.docVersion
        };
      } else {
        // Store failed saves for retry
        failedSavesRef.current.push(...updatesToSave);
        if (onUnsavedChanges) {
          onUnsavedChanges();
        }
        throw new Error(data?.error || 'Unknown save error');
      }

    } catch (error) {
      console.error('Per-cell save exception:', error);
      throw error;
    }
  }, [rundownId]);

  // Retry failed saves when connection is restored
  const retryFailedSaves = useCallback(async () => {
    if (failedSavesRef.current.length === 0) {
      return;
    }

    console.log('🔄 Retrying', failedSavesRef.current.length, 'failed saves after reconnection');
    
    const savesToRetry = [...failedSavesRef.current];
    failedSavesRef.current = [];
    
    // Add them to pending updates for normal save flow
    pendingUpdatesRef.current.push(...savesToRetry);
    
    // Trigger immediate save
    await savePendingUpdates();
  }, [savePendingUpdates]);

  // Monitor browser network status for reconnection
  useCallback(() => {
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
  }, [retryFailedSaves])();

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

  return {
    trackCellChange,
    flushPendingUpdates,
    hasPendingUpdates,
    retryFailedSaves
  };
};