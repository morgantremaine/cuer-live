import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useAuth } from './useAuth';

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
  isProcessingRealtimeUpdate?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
  onShowcallerActivity?: (active: boolean) => void;
}

export const useRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  enabled = true,
  currentContentHash,
  isEditing = false,
  hasUnsavedChanges = false,
  isProcessingRealtimeUpdate = false,
  trackOwnUpdate,
  onShowcallerActivity
}: UseRealtimeRundownProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const onShowcallerActivityRef = useRef(onShowcallerActivity);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  onShowcallerActivityRef.current = onShowcallerActivity;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Signal activity
  const signalActivity = useCallback(() => {
    if (onShowcallerActivityRef.current) {
      onShowcallerActivityRef.current(true);
      
      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Set timeout to clear activity after 8 seconds
      activityTimeoutRef.current = setTimeout(() => {
        if (onShowcallerActivityRef.current) {
          onShowcallerActivityRef.current(false);
        }
      }, 8000);
    }
  }, []);

  // Enhanced showcaller-only detection
  const isShowcallerOnlyUpdate = useCallback((payload: any): boolean => {
    const newData = payload.new;
    const oldData = payload.old;
    
    // If no old data, can't determine if showcaller-only
    if (!oldData || !newData) {
      return false;
    }

    // Check if only showcaller_state changed
    const fieldsToCheck = ['title', 'items', 'start_time', 'timezone', 'updated_at'];
    let hasContentChanges = false;
    
    for (const field of fieldsToCheck) {
      if (field === 'updated_at') {
        // Skip updated_at as it always changes
        continue;
      }
      
      // Deep comparison for items array
      if (field === 'items') {
        const oldItemsStr = JSON.stringify(oldData.items || []);
        const newItemsStr = JSON.stringify(newData.items || []);
        if (oldItemsStr !== newItemsStr) {
          hasContentChanges = true;
          break;
        }
      } else {
        // Simple comparison for other fields
        if (oldData[field] !== newData[field]) {
          hasContentChanges = true;
          break;
        }
      }
    }
    
    // If no content changes but showcaller_state changed, it's showcaller-only
    const showcallerStateChanged = JSON.stringify(oldData.showcaller_state || {}) !== JSON.stringify(newData.showcaller_state || {});
    
    return !hasContentChanges && showcallerStateChanged;
  }, []);

  // Function to track our own updates
  const trackOwnUpdateLocal = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    console.log('📡 Tracking own realtime update:', timestamp, 'total tracked:', ownUpdateTrackingRef.current.size);
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
      console.log('📡 Cleaned up tracked realtime update:', timestamp);
    }, 10000);
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // ENHANCED: Debounced update handler with better showcaller detection
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    const updateData: RealtimeUpdate = {
      timestamp: payload.new?.updated_at || new Date().toISOString(),
      rundownId: payload.new?.id,
      currentRundownId: rundownId!,
      currentUserId: user?.id || '',
      trackedUpdates: [],
      isEditing,
      hasUnsavedChanges,
      isProcessing: isProcessingRealtimeUpdate,
      contentHash: currentContentHash,
      showcallerState: payload.new?.showcaller_state
    };

    // Prevent processing duplicate updates based on timestamp
    if (updateData.timestamp === lastProcessedUpdateRef.current) {
      console.log('📡 Skipping duplicate realtime update:', updateData.timestamp);
      return;
    }

    // Skip if this update originated from this user
    if (ownUpdateTrackingRef.current.has(updateData.timestamp)) {
      console.log('📡 Skipping own realtime update:', updateData.timestamp);
      return;
    }

    // ENHANCED: Better showcaller-only detection
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

    const analysis = {
      isShowcallerOnly,
      isEditing,
      hasUnsavedChanges,
      isProcessing: isProcessingRealtimeUpdate,
      contentHashMatch
    };

    console.log('📡 Realtime update received:', updateData);
    console.log('📡 Update analysis:', analysis);

    // If it's showcaller-only and user is not editing, allow the update but don't trigger content sync
    if (isShowcallerOnly && !isEditing) {
      console.log('📺 Allowing showcaller-only update (user not editing)');
      signalActivity();
      lastProcessedUpdateRef.current = updateData.timestamp;
      return;
    }

    // ENHANCED: Debounce rapid updates to prevent conflicts
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      lastProcessedUpdateRef.current = updateData.timestamp;
      
      console.log('🔄 Processing remote update from teammate');
      
      signalActivity();
      
      try {
        // Apply the rundown update (content changes only)
        onRundownUpdateRef.current(payload.new);
      } catch (error) {
        console.error('Error processing realtime update:', error);
      }
    }, 150); // 150ms debounce for rapid updates
    
  }, [rundownId, user?.id, isEditing, hasUnsavedChanges, isProcessingRealtimeUpdate, currentContentHash, signalActivity, isShowcallerOnlyUpdate]);

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
          console.log('📡 Enhanced realtime subscription status: SUBSCRIBED for rundown:', rundownId);
          console.log('✅ Successfully subscribed to enhanced rundown content updates');
          setIsConnected(true);
        } else {
          console.log('📡 Enhanced realtime subscription status:', status);
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
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  return {
    isConnected,
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
