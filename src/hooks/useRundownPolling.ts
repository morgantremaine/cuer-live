
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseRundownPollingProps {
  rundownId: string | undefined;
  hasUnsavedChanges: boolean;
  isAutoSaving: boolean;
  lastSavedTimestamp: string | null;
  onUpdateReceived: (data: {
    title: string;
    items: RundownItem[];
    columns?: Column[];
    timezone?: string;
    startTime?: string;
    updatedAt: string;
  }) => void;
  onConflictDetected: () => void;
}

export const useRundownPolling = ({
  rundownId,
  hasUnsavedChanges,
  isAutoSaving,
  lastSavedTimestamp,
  onUpdateReceived,
  onConflictDetected
}: UseRundownPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdateReceived, setLastUpdateReceived] = useState<string | null>(null);
  const [hasRemoteUpdates, setHasRemoteUpdates] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActiveRef = useRef(false);

  const checkForUpdates = async () => {
    if (!rundownId || isAutoSaving || !isPollingActiveRef.current) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('title, items, columns, timezone, start_time, updated_at')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.log('Polling error (non-critical):', error.message);
        return;
      }

      if (data && data.updated_at) {
        // Only process if we have a newer timestamp
        if (lastSavedTimestamp && data.updated_at > lastSavedTimestamp) {
          console.log('Remote update detected:', data.updated_at);
          
          // If user has unsaved changes, show conflict indicator
          if (hasUnsavedChanges) {
            console.log('Conflict detected: user has unsaved changes');
            onConflictDetected();
            setHasRemoteUpdates(true);
            return;
          }

          // Safe to update - no local changes
          setLastUpdateReceived(data.updated_at);
          setHasRemoteUpdates(true);
          
          onUpdateReceived({
            title: data.title || 'Untitled Rundown',
            items: data.items || [],
            columns: data.columns || undefined,
            timezone: data.timezone || undefined,
            startTime: data.start_time || undefined,
            updatedAt: data.updated_at
          });

          // Clear the indicator after a short delay
          setTimeout(() => setHasRemoteUpdates(false), 2000);
        }
      }
    } catch (error) {
      console.log('Polling network error (non-critical):', error);
    }
  };

  // Start polling when conditions are met
  useEffect(() => {
    if (!rundownId) {
      return;
    }

    console.log('Starting rundown polling for:', rundownId);
    isPollingActiveRef.current = true;
    setIsPolling(true);

    // Start polling every 5 seconds (same as teleprompter)
    pollingIntervalRef.current = setInterval(checkForUpdates, 5000);

    return () => {
      console.log('Stopping rundown polling');
      isPollingActiveRef.current = false;
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [rundownId]);

  // Pause polling when auto-saving to prevent conflicts
  useEffect(() => {
    if (isAutoSaving) {
      isPollingActiveRef.current = false;
    } else {
      isPollingActiveRef.current = !!rundownId;
    }
  }, [isAutoSaving, rundownId]);

  const clearRemoteUpdatesIndicator = () => {
    setHasRemoteUpdates(false);
  };

  return {
    isPolling,
    hasRemoteUpdates,
    lastUpdateReceived,
    clearRemoteUpdatesIndicator
  };
};
