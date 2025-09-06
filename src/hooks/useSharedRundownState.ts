
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';
import { RealtimeWatchdog } from '@/utils/realtimeWatchdog';
import { useBulletproofRundownState } from './useBulletproofRundownState';

export const useSharedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;
  
  const [rundownData, setRundownData] = useState<{
    id: string;
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
    timezone?: string;
    lastUpdated?: string;
    showcallerState?: any;
    visibility?: string;
    docVersion?: number;
    lastUpdatedBy?: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced refs for better real-time handling
  const lastUpdateTimestamp = useRef<string | null>(null);
  const lastShowcallerTimestamp = useRef<string | null>(null);
  const lastDocVersion = useRef<number>(0);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const showcallerPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeSubscription = useRef<any>(null);
  const contentSubscription = useRef<any>(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);
  const watchdogRef = useRef<RealtimeWatchdog | null>(null);

  // Enhanced time update with proper cleanup
  useEffect(() => {
    // Clear existing timer
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }
    
    timeUpdateInterval.current = setInterval(() => {
      if (mountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);
    
    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    };
  }, []);

  // Optimized load function with better showcaller change detection
  const loadRundownData = useCallback(async (forceReload = false) => {
    if (!rundownId || isLoadingRef.current || !mountedRef.current) {
      return;
    }

    logger.debug(`Loading rundown data for ID: ${rundownId}`);
    isLoadingRef.current = true;

    try {
      // Use the updated RPC function that always returns data for shared rundowns
      const { data, error: queryError } = await supabase
        .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

      if (!mountedRef.current) return;

      if (queryError) {
        logger.error('Error loading rundown:', queryError);
        setError(`Database error: ${queryError.message}`);
        setRundownData(null);
      } else if (data) {
        // Check if we need to update based on timestamps
        const showcallerChanged = lastShowcallerTimestamp.current !== JSON.stringify(data.showcaller_state);
        const contentChanged = lastUpdateTimestamp.current !== data.updated_at;
        
        if (forceReload || contentChanged || showcallerChanged) {
          const newRundownData = {
            id: data.id,
            title: data.title || 'Untitled Rundown',
            items: data.items || [],
            columns: data.columns || [],
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'UTC',
            lastUpdated: data.updated_at,
            showcallerState: data.showcaller_state,
            visibility: data.visibility,
            docVersion: data.doc_version,
            lastUpdatedBy: data.last_updated_by
          };
          
          logger.debug(`Updated rundown data: ${newRundownData.title} ${showcallerChanged ? '(showcaller changed)' : '(content changed)'}`);
          setRundownData(newRundownData);
          lastUpdateTimestamp.current = data.updated_at;
          lastShowcallerTimestamp.current = JSON.stringify(data.showcaller_state);
          
          // Update watchdog tracking
          if (watchdogRef.current && data.doc_version) {
            watchdogRef.current.updateLastSeen(data.doc_version, data.updated_at);
          }
          lastDocVersion.current = data.doc_version || 0;
        }
        setError(null);
      } else {
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      logger.error('Network error loading rundown', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    isLoadingRef.current = false;
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [rundownId]);

  // Enhanced real-time subscription for both content and showcaller updates using bulletproof system
  const { isConnected: realtimeConnected } = useBulletproofRundownState();
  // Simple shared view - just check connection status

  // Start watchdog for shared views
  useEffect(() => {
    if (realtimeConnected && !watchdogRef.current && rundownId) {
      watchdogRef.current = RealtimeWatchdog.getInstance(rundownId, 'shared-viewer', {
        onStaleData: (latestData) => {
          logger.debug('Watchdog detected stale data, refreshing');
          loadRundownData(true);
        },
        onReconnect: () => {
          logger.debug('Watchdog triggered reconnect');
          loadRundownData(true);
        }
      });
      watchdogRef.current.start();
    }
  }, [realtimeConnected, rundownId, loadRundownData]);

  // Initial load
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      loadRundownData();
    }
  }, [rundownId, loadRundownData]);

  // Reduced polling - now real-time is primary, polling is fallback only
  useEffect(() => {
    if (!rundownId || loading || !rundownData) return;
    
    // Clear any existing intervals
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    if (showcallerPollingInterval.current) {
      clearInterval(showcallerPollingInterval.current);
      showcallerPollingInterval.current = null;
    }
    
    const isPlaying = rundownData?.showcallerState?.isPlaying;
    
    if (isPlaying) {
      // Fallback polling for showcaller when playing (every 2 seconds)
      logger.debug('Starting fallback showcaller polling (2s interval)');
      showcallerPollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        } else {
          if (showcallerPollingInterval.current) {
            clearInterval(showcallerPollingInterval.current);
            showcallerPollingInterval.current = null;
          }
        }
      }, 2000); // Reduced frequency since real-time is primary
    } else {
      // Light fallback polling for general updates (every 30 seconds)
      logger.debug('Starting light fallback polling (30s interval)');
      pollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        } else {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      }, 30000); // Much reduced since real-time handles most updates
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      if (showcallerPollingInterval.current) {
        clearInterval(showcallerPollingInterval.current);
        showcallerPollingInterval.current = null;
      }
    };
  }, [rundownId, loading, rundownData?.showcallerState?.isPlaying, loadRundownData]);

  // Enhanced cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      // Clear all intervals and subscriptions
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      if (showcallerPollingInterval.current) {
        clearInterval(showcallerPollingInterval.current);
        showcallerPollingInterval.current = null;
      }
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }
      if (contentSubscription.current) {
        supabase.removeChannel(contentSubscription.current);
        contentSubscription.current = null;
      }
      if (watchdogRef.current) {
        watchdogRef.current.stop();
        RealtimeWatchdog.cleanup(rundownId || '', 'shared-viewer');
        watchdogRef.current = null;
      }
    };
  }, []);

  // Find the showcaller segment from showcaller_state or fallback to item status
  const currentSegmentId = rundownData?.showcallerState?.currentSegmentId || 
    rundownData?.items.find(item => 
      item.type !== 'header' && item.status === 'current'
    )?.id || null;

  // Calculate live time remaining based on showcaller state
  const timeRemaining = (() => {
    const showcallerState = rundownData?.showcallerState;
    
    if (!showcallerState?.isPlaying || !showcallerState?.playbackStartTime || !currentSegmentId) {
      return showcallerState?.timeRemaining || 0;
    }

    // Find current segment duration
    const currentSegment = rundownData.items.find(item => item.id === currentSegmentId);
    if (!currentSegment?.duration) {
      return showcallerState?.timeRemaining || 0;
    }

    // Calculate time remaining based on playback start time
    const timeToSeconds = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return Math.floor(parts[0] * 60 + parts[1]);
      } else if (parts.length === 3) {
        return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
      }
      return 0;
    };

    const segmentDuration = timeToSeconds(currentSegment.duration);
    const elapsedTime = Math.floor((Date.now() - showcallerState.playbackStartTime) / 1000);
    const remaining = Math.max(0, segmentDuration - elapsedTime);
    
    return remaining;
  })();

  return {
    rundownData,
    currentTime,
    currentSegmentId,
    loading,
    error,
    timeRemaining
  };
};
