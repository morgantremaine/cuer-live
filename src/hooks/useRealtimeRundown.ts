
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

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
  onShowcallerStateReceived?: (state: any) => void;
}

// Centralized timeout management to prevent memory leaks
class TimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  
  set(id: string, callback: () => void, delay: number): void {
    this.clear(id);
    const timeout = setTimeout(callback, delay);
    this.timeouts.set(id, timeout);
  }
  
  clear(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }
  
  clearAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
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
  
  // NEW: Separate visual processing state that doesn't interfere with autosave
  const [isVisuallyProcessing, setIsVisuallyProcessing] = useState(false);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  onShowcallerActivityRef.current = onShowcallerActivity;
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Signal activity with centralized timeout management
  const signalActivity = useCallback(() => {
    if (onShowcallerActivityRef.current) {
      onShowcallerActivityRef.current(true);
      
      // Use centralized timeout manager
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
    
    // Clean up old tracked updates after 10 seconds
    timeoutManagerRef.current.set(`cleanup-${timestamp}`, () => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 10000);
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Enhanced update handler with better showcaller detection
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
      return;
    }

    // Skip if this update originated from this user
    if (ownUpdateTrackingRef.current.has(updateData.timestamp)) {
      return;
    }

    // NEW: Show visual processing indicator for ALL team updates (both content and showcaller)
    logger.log('📡 Received team update, showing visual processing indicator');
    setIsVisuallyProcessing(true);
    
    // Auto-hide visual processing after 1.5 seconds
    timeoutManagerRef.current.set('visual-processing', () => {
      setIsVisuallyProcessing(false);
      logger.log('🔄 Visual processing indicator hidden');
    }, 1500);

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

    // If it's showcaller-only, handle it specially
    if (isShowcallerOnly) {
      logger.log('📺 Received external showcaller visual state');
      
      // Signal showcaller activity with extended timeout
      if (onShowcallerActivityRef.current) {
        onShowcallerActivityRef.current(true);
        
        // Use centralized timeout manager for showcaller activity
        timeoutManagerRef.current.set('showcaller-activity', () => {
          if (onShowcallerActivityRef.current) {
            onShowcallerActivityRef.current(false);
          }
        }, 12000); // 12 seconds for showcaller activity
      }
      
      // Pass showcaller state to the callback if available
      if (onShowcallerStateReceivedRef.current && payload.new?.showcaller_state) {
        onShowcallerStateReceivedRef.current(payload.new.showcaller_state);
      }
      
      lastProcessedUpdateRef.current = updateData.timestamp;
      return; // Don't trigger content sync for showcaller-only updates
    }

    // Debounce rapid updates to prevent conflicts using centralized timeout manager
    timeoutManagerRef.current.set('processing', () => {
      lastProcessedUpdateRef.current = updateData.timestamp;
      
      signalActivity();
      
      try {
        // Apply the rundown update (content changes only)
        onRundownUpdateRef.current(payload.new);
      } catch (error) {
        logger.error('Error processing realtime update:', error);
      }
    }, 150);
    
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
      // Clean up all timeouts when component unmounts
      timeoutManagerRef.current.clearAll();
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  return {
    isConnected,
    isVisuallyProcessing, // NEW: Return the visual processing state
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
