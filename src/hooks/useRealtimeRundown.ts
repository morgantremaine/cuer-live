import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';
import { normalizeTimestamp, TimeoutManager } from '@/utils/realtimeUtils';

interface RealtimeUpdate {
  timestamp: string;
  rundownId: string;
  currentRundownId: string;
  currentUserId: string;
  trackedUpdates: string[];
  isEditing?: boolean;
  hasUnsavedChanges?: boolean;
  isProcessing?: boolean;
  contentHash?: string;
  showcallerState?: any;
}

interface UseRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate: (data: any) => void;
  enabled?: boolean;
  currentContentHash?: string;
  isEditing?: boolean;
  hasUnsavedChanges?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
  onShowcallerActivity?: (active: boolean) => void;
  onShowcallerStateReceived?: (state: any) => void;
}

export const useRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  enabled = true,
  currentContentHash,
  isEditing = false,
  hasUnsavedChanges = false,
  trackOwnUpdate,
  onShowcallerActivity,
  onShowcallerStateReceived
}: UseRealtimeRundownProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const onShowcallerActivityRef = useRef(onShowcallerActivity);
  const onShowcallerStateReceivedRef = useRef(onShowcallerStateReceived);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const timeoutManagerRef = useRef(new TimeoutManager());
  const [isConnected, setIsConnected] = useState(false);
  
  // Content processing state (blue Wi-Fi icon)
  const [isProcessingContentUpdate, setIsProcessingContentUpdate] = useState(false);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  onShowcallerActivityRef.current = onShowcallerActivity;
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Signal activity with centralized timeout management
  const signalActivity = useCallback(() => {
    if (onShowcallerActivityRef.current) {
      onShowcallerActivityRef.current(true);
      
      timeoutManagerRef.current.set('activity', () => {
        if (onShowcallerActivityRef.current) {
          onShowcallerActivityRef.current(false);
        }
      }, 8000);
    }
  }, []);

  // Enhanced showcaller-only detection with better logic
  const isShowcallerOnlyUpdate = useCallback((payload: any): boolean => {
    const newData = payload.new;
    const oldData = payload.old;
    
    if (!oldData || !newData) {
      return false;
    }

    const fieldsToCheck = ['title', 'items', 'start_time', 'timezone', 'updated_at'];
    let hasContentChanges = false;
    
    for (const field of fieldsToCheck) {
      if (field === 'updated_at') {
        continue;
      }
      
      if (field === 'items') {
        const oldItemsStr = JSON.stringify(oldData.items || []);
        const newItemsStr = JSON.stringify(newData.items || []);
        if (oldItemsStr !== newItemsStr) {
          hasContentChanges = true;
          break;
        }
      } else {
        if (oldData[field] !== newData[field]) {
          hasContentChanges = true;
          break;
        }
      }
    }
    
    const showcallerStateChanged = JSON.stringify(oldData.showcaller_state || {}) !== JSON.stringify(newData.showcaller_state || {});
    
    return !hasContentChanges && showcallerStateChanged;
  }, []);

  // Function to track our own updates with normalized timestamps
  const trackOwnUpdateLocal = useCallback((timestamp: string) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    ownUpdateTrackingRef.current.add(normalizedTimestamp);
    
    // Clean up old tracked updates after 10 seconds
    timeoutManagerRef.current.set(`cleanup-${normalizedTimestamp}`, () => {
      ownUpdateTrackingRef.current.delete(normalizedTimestamp);
    }, 10000);
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Enhanced update handler - COMPLETELY IGNORE SHOWCALLER UPDATES FOR CONTENT PROCESSING
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    const rawTimestamp = payload.new?.updated_at || new Date().toISOString();
    const normalizedTimestamp = normalizeTimestamp(rawTimestamp);

    const updateData: RealtimeUpdate = {
      timestamp: normalizedTimestamp,
      rundownId: payload.new?.id,
      currentRundownId: rundownId!,
      currentUserId: user?.id || '',
      trackedUpdates: [],
      isEditing,
      hasUnsavedChanges,
      contentHash: currentContentHash,
      showcallerState: payload.new?.showcaller_state
    };

    // Prevent processing duplicate updates based on normalized timestamp
    if (updateData.timestamp === lastProcessedUpdateRef.current) {
      return;
    }

    // Skip if this update originated from this user (using normalized timestamp)
    const isOwnUpdate = ownUpdateTrackingRef.current.has(normalizedTimestamp);
    if (isOwnUpdate) {
      return;
    }

    // Enhanced showcaller-only detection
    const isShowcallerOnly = isShowcallerOnlyUpdate(payload);
    
    // Create content hash from the new data (excluding showcaller_state)
    const contentForHash = {
      items: payload.new?.items || [],
      title: payload.new?.title || '',
      start_time: payload.new?.start_time || '',
      timezone: payload.new?.timezone || ''
    };
    const newContentHash = JSON.stringify(contentForHash);
    const contentHashMatch = currentContentHash === newContentHash;

    // CRITICAL: If it's showcaller-only, handle it specially but NEVER set content processing state
    if (isShowcallerOnly) {
      // Signal showcaller activity with mobile-friendly extended timeout
      if (onShowcallerActivityRef.current) {
        onShowcallerActivityRef.current(true);
        
        // Longer timeout for mobile devices to account for connection delays
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const activityTimeout = isMobile ? 15000 : 12000;
        
        timeoutManagerRef.current.set('showcaller-activity', () => {
          if (onShowcallerActivityRef.current) {
            onShowcallerActivityRef.current(false);
          }
        }, activityTimeout);
      }
      
      // Pass showcaller state to the callback if available
      if (onShowcallerStateReceivedRef.current && payload.new?.showcaller_state) {
        onShowcallerStateReceivedRef.current(payload.new.showcaller_state);
      }
      
      lastProcessedUpdateRef.current = updateData.timestamp;
      return;
    }

    // Additional check: Skip if content hashes match (no actual content change)
    if (contentHashMatch) {
      lastProcessedUpdateRef.current = updateData.timestamp;
      return;
    }

    // Only set content processing state for REAL CONTENT CHANGES from OTHER USERS
    setIsProcessingContentUpdate(true);

    // Clear any existing processing timeout to prevent race conditions
    timeoutManagerRef.current.clear('content-processing');

    // Mobile-friendly debounced updates with longer processing delays
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const processingDelay = isMobile ? 300 : 150; // Longer delay for mobile
    
    timeoutManagerRef.current.set('processing', () => {
      lastProcessedUpdateRef.current = updateData.timestamp;
      
      signalActivity();
      
      try {
        // Apply the rundown update (content changes only)
        onRundownUpdateRef.current(payload.new);
      } catch (error) {
        logger.error('Error processing realtime update:', error);
      }
      
      // Clear content processing state after a brief delay for visibility
      timeoutManagerRef.current.set('content-processing', () => {
        setIsProcessingContentUpdate(false);
      }, 600);
      
    }, processingDelay);
    
  }, [rundownId, user?.id, isEditing, hasUnsavedChanges, currentContentHash, signalActivity, isShowcallerOnlyUpdate]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }
    
    const channel = supabase
      .channel(`rundown-realtime-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      }
      timeoutManagerRef.current.clearAll();
      setIsProcessingContentUpdate(false);
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  return {
    isConnected,
    isProcessingContentUpdate,
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
