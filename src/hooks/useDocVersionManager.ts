import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

interface DocVersionState {
  currentVersion: number;
  lastProcessedTimestamp: string | null;
  isProcessingUpdate: boolean;
  gapDetectionInProgress: boolean;
}

interface UpdateMetadata {
  docVersion: number;
  timestamp: string;
  userId?: string;
}

/**
 * Centralized doc_version management with proper concurrency control
 * Prevents race conditions, gap detection loops, and timestamp issues
 */
export const useDocVersionManager = (rundownId: string | null) => {
  const stateRef = useRef<DocVersionState>({
    currentVersion: 0,
    lastProcessedTimestamp: null,
    isProcessingUpdate: false,
    gapDetectionInProgress: false
  });

  const ownUpdatesRef = useRef<Set<string>>(new Set());
  const processingQueueRef = useRef<UpdateMetadata[]>([]);

  // Track our own updates to prevent feedback loops
  const trackOwnUpdate = useCallback((timestamp: string, docVersion?: number) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    ownUpdatesRef.current.add(normalizedTimestamp);
    
    if (docVersion !== undefined) {
      stateRef.current.currentVersion = Math.max(stateRef.current.currentVersion, docVersion);
      stateRef.current.lastProcessedTimestamp = normalizedTimestamp;
    }
    
    // Clean up old tracked updates after 30 seconds
    setTimeout(() => {
      ownUpdatesRef.current.delete(normalizedTimestamp);
    }, 30000);
    
    console.log('📝 DocVersion: Tracked own update', { timestamp: normalizedTimestamp, docVersion });
  }, []);

  // Check if an update is from ourselves
  const isOwnUpdate = useCallback((timestamp: string, userId?: string) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    const isOwn = ownUpdatesRef.current.has(normalizedTimestamp);
    
    if (isOwn) {
      console.log('⏭️ DocVersion: Skipping own update', { timestamp: normalizedTimestamp });
    }
    
    return isOwn;
  }, []);

  // Process incoming updates with proper ordering and gap detection
  const processUpdate = useCallback(async (metadata: UpdateMetadata, onApplyUpdate: (data: any) => void): Promise<boolean> => {
    const { docVersion, timestamp, userId } = metadata;
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    
    // Skip own updates
    if (isOwnUpdate(timestamp, userId)) {
      return false;
    }

    // Skip stale updates
    if (docVersion <= stateRef.current.currentVersion) {
      console.log('⏭️ DocVersion: Skipping stale update', {
        incoming: docVersion,
        current: stateRef.current.currentVersion
      });
      return false;
    }

    // Detect gaps and handle them properly
    const expectedVersion = stateRef.current.currentVersion + 1;
    const hasGap = docVersion > expectedVersion;

    if (hasGap && !stateRef.current.gapDetectionInProgress) {
      console.warn('🔍 DocVersion: Gap detected - performing catch-up', {
        expected: expectedVersion,
        received: docVersion,
        gap: docVersion - expectedVersion
      });

      // Prevent concurrent gap detection
      stateRef.current.gapDetectionInProgress = true;

      try {
        // Fetch latest complete data from server
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId!)
          .single();

        if (!error && data) {
          const serverVersion = data.doc_version || 0;
          const serverTimestamp = normalizeTimestamp(data.updated_at);

          // Only apply if server has newer data than what we're processing
          if (serverVersion >= docVersion) {
            console.log('✅ DocVersion: Applying catch-up data', {
              serverVersion,
              targetVersion: docVersion
            });

            // Update our state to match server
            stateRef.current.currentVersion = serverVersion;
            stateRef.current.lastProcessedTimestamp = serverTimestamp;

            // Apply the complete server data
            onApplyUpdate(data);
            return true;
          } else {
            console.warn('⚠️ DocVersion: Server data is stale during catch-up', {
              serverVersion,
              targetVersion: docVersion
            });
          }
        } else {
          console.error('❌ DocVersion: Failed to fetch data during gap detection', error);
        }
      } catch (error) {
        console.error('❌ DocVersion: Catch-up failed', error);
      } finally {
        stateRef.current.gapDetectionInProgress = false;
      }
    }

    // If no gap or gap detection completed, process normally
    if (!hasGap || stateRef.current.gapDetectionInProgress === false) {
      console.log('✅ DocVersion: Processing sequential update', {
        from: stateRef.current.currentVersion,
        to: docVersion
      });

      stateRef.current.currentVersion = docVersion;
      stateRef.current.lastProcessedTimestamp = normalizedTimestamp;
      
      return true; // Caller should apply the update
    }

    return false; // Don't apply - handled by gap detection
  }, [rundownId, isOwnUpdate]);

  // Increment version for outgoing saves with optimistic concurrency
  const prepareUpdate = useCallback(async (updateData: any): Promise<{ data: any; expectedVersion: number } | null> => {
    if (!rundownId) return null;

    try {
      // Get current version from database
      const { data: currentData, error } = await supabase
        .from('rundowns')
        .select('doc_version, updated_at')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('❌ DocVersion: Failed to get current version', error);
        return null;
      }

      const currentVersion = currentData.doc_version || 0;
      const expectedVersion = currentVersion + 1;

      // Update our local tracking
      stateRef.current.currentVersion = Math.max(stateRef.current.currentVersion, currentVersion);

      console.log('📝 DocVersion: Preparing update', {
        currentVersion,
        expectedVersion
      });

      return {
        data: {
          ...updateData,
          // Note: doc_version increment is handled by database trigger
          // We just need to ensure we're updating from the right base version
        },
        expectedVersion: currentVersion // Use current version for optimistic concurrency check
      };
    } catch (error) {
      console.error('❌ DocVersion: Failed to prepare update', error);
      return null;
    }
  }, [rundownId]);

  // Handle save with proper optimistic concurrency
  const executeSave = useCallback(async (
    updateData: any,
    onSuccess: (result: any) => void,
    onConflict?: (conflictData: any) => void
  ): Promise<boolean> => {
    const prepared = await prepareUpdate(updateData);
    if (!prepared) return false;

    try {
      // Perform update with optimistic concurrency check
      const { data, error } = await supabase
        .from('rundowns')
        .update(prepared.data)
        .eq('id', rundownId!)
        .eq('doc_version', prepared.expectedVersion) // Optimistic concurrency
        .select('doc_version, updated_at');

      if (error) {
        console.error('❌ DocVersion: Save failed', error);
        return false;
      }

      if (!data || data.length === 0) {
        // Version conflict detected
        console.warn('⚠️ DocVersion: Version conflict detected during save');
        
        if (onConflict) {
          // Fetch latest data for conflict resolution
          const { data: latestData, error: fetchError } = await supabase
            .from('rundowns')
            .select('*')
            .eq('id', rundownId!)
            .single();

          if (!fetchError && latestData) {
            onConflict(latestData);
          }
        }
        
        return false;
      }

      // Save successful
      const result = data[0];
      const savedTimestamp = normalizeTimestamp(result.updated_at);
      
      // Track our successful update
      trackOwnUpdate(savedTimestamp, result.doc_version);
      
      // Update our state
      stateRef.current.currentVersion = result.doc_version;
      stateRef.current.lastProcessedTimestamp = savedTimestamp;

      console.log('✅ DocVersion: Save successful', {
        newVersion: result.doc_version,
        timestamp: savedTimestamp
      });

      onSuccess(result);
      return true;
      
    } catch (error) {
      console.error('❌ DocVersion: Save execution failed', error);
      return false;
    }
  }, [rundownId, prepareUpdate, trackOwnUpdate]);

  // Get current state
  const getCurrentState = useCallback(() => {
    return {
      currentVersion: stateRef.current.currentVersion,
      lastProcessedTimestamp: stateRef.current.lastProcessedTimestamp,
      isProcessingUpdate: stateRef.current.isProcessingUpdate,
      gapDetectionInProgress: stateRef.current.gapDetectionInProgress
    };
  }, []);

  // Initialize state from existing data
  const initializeFromData = useCallback((data: any) => {
    const version = data.doc_version || 0;
    const timestamp = data.updated_at ? normalizeTimestamp(data.updated_at) : null;
    
    stateRef.current.currentVersion = version;
    stateRef.current.lastProcessedTimestamp = timestamp;
    
    console.log('🔄 DocVersion: Initialized state', { version, timestamp });
  }, []);

  return {
    processUpdate,
    executeSave,
    trackOwnUpdate,
    isOwnUpdate,
    getCurrentState,
    initializeFromData
  };
};