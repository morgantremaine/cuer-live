
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';
import { showcallerBroadcast } from '@/utils/showcallerBroadcast';
import { timeToSeconds } from '@/utils/rundownCalculations';

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
  // Polling refs and state
  const lastDocVersion = useRef<number>(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);
  const isTabVisible = useRef(true);

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

  // Normalized data loading function using RPC - ensures consistent data format
  const loadRundownData = useCallback(async (forceReload = false) => {
    if (!rundownId || isLoadingRef.current || !mountedRef.current) {
      return;
    }

    logger.debug(`Loading normalized rundown data for ID: ${rundownId} (RPC-driven)`);
    isLoadingRef.current = true;

    try {
      // Use RPC function for consistent, normalized data format
      const { data, error: queryError } = await supabase
        .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

      if (!mountedRef.current) return;

      if (queryError) {
        logger.error('Error loading rundown via RPC:', queryError);
        setError(`Database error: ${queryError.message}`);
        setRundownData(null);
      } else if (data) {
        // Normalize data structure for consistent handling
        const normalizedRundownData = {
          id: data.id,
          title: data.title || 'Untitled Rundown',
          items: Array.isArray(data.items) ? data.items : [],
          columns: Array.isArray(data.columns) ? data.columns : [],
          startTime: data.start_time || '09:00:00',
          timezone: data.timezone || 'UTC',
          lastUpdated: data.updated_at,
          showcallerState: data.showcaller_state || null,
          visibility: data.visibility,
          docVersion: data.doc_version || 0,
          lastUpdatedBy: data.last_updated_by
        };
        
        logger.debug(`Normalized rundown data loaded: ${normalizedRundownData.title} (v${normalizedRundownData.docVersion})`);
        setRundownData(normalizedRundownData);
        lastDocVersion.current = normalizedRundownData.docVersion;
        setError(null);
      } else {
        setError('Rundown not found or not public');
        setRundownData(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      logger.error('Network error loading rundown via RPC', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    isLoadingRef.current = false;
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [rundownId]);

  // Tab always considered visible for persistent connections
  useEffect(() => {
    isTabVisible.current = true;
  }, []);

  // Polling mechanism for content updates
  const startPolling = useCallback(() => {
    if (!rundownId || !mountedRef.current) return;

    // Clear existing polling
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    const pollData = async () => {
      if (!mountedRef.current || !isTabVisible.current || isLoadingRef.current) return;

      try {
        const { data, error: queryError } = await supabase
          .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

        if (!mountedRef.current) return;

        if (queryError) {
          logger.error('Polling error:', queryError);
          return;
        }

        if (data) {
          const normalizedRundownData = {
            id: data.id,
            title: data.title || 'Untitled Rundown',
            items: Array.isArray(data.items) ? data.items : [],
            columns: Array.isArray(data.columns) ? data.columns : [],
            startTime: data.start_time || '09:00:00',
            timezone: data.timezone || 'UTC',
            lastUpdated: data.updated_at,
            showcallerState: data.showcaller_state || null,
            visibility: data.visibility,
            docVersion: data.doc_version || 0,
            lastUpdatedBy: data.last_updated_by
          };

          // Only update if doc version has changed
          if (normalizedRundownData.docVersion > lastDocVersion.current) {
            logger.debug(`Polling update: v${normalizedRundownData.docVersion}`);
            setRundownData(normalizedRundownData);
            lastDocVersion.current = normalizedRundownData.docVersion;
          }
        }
      } catch (error) {
        if (!mountedRef.current) return;
        logger.error('Polling network error:', error);
      }
    };

    // Smart polling intervals based on showcaller state
    const getPollingInterval = () => {
      const showcallerActive = rundownData?.showcallerState?.isPlaying;
      return showcallerActive ? 1000 : 3000; // 1s when active, 3s when idle
    };

    // Initial poll
    pollData();

    // Set up recurring polling
    pollingInterval.current = setInterval(pollData, getPollingInterval());

    logger.debug(`Started polling with ${getPollingInterval()}ms interval`);
  }, [rundownId, rundownData?.showcallerState?.isPlaying]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
      logger.debug('Stopped polling');
    }
  }, []);

  // Showcaller broadcast subscription for real-time showcaller updates
  useEffect(() => {
    if (!rundownId) return;

    logger.debug('Setting up showcaller broadcast subscription for shared view');

    const unsubscribe = showcallerBroadcast.subscribeToShowcallerBroadcasts(
      rundownId,
      (state) => {
        if (!mountedRef.current) return;
        
        logger.debug('Shared view received showcaller broadcast:', state);
        
        // Update rundown data with new showcaller state
        setRundownData(prev => prev ? {
          ...prev,
          showcallerState: {
            currentSegmentId: state.currentSegmentId,
            isPlaying: state.isPlaying,
            timeRemaining: state.timeRemaining,
            playbackStartTime: Date.now() - ((state.timeRemaining || 0) * 1000), // Approximate
            controllerId: state.userId,
            lastUpdate: new Date(state.timestamp).toISOString()
          }
        } : null);
      },
      'shared_view_anonymous' // Anonymous user ID for shared views
    );

    return unsubscribe;
  }, [rundownId]);

  // Initial load and start polling
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      logger.debug('Initial load and start polling for shared rundown');
      loadRundownData().then(() => {
        startPolling();
      });
    }

    return () => {
      stopPolling();
    };
  }, [rundownId, loadRundownData, startPolling, stopPolling]);

  // Restart polling when showcaller state changes (for smart intervals)
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      startPolling();
    }
  }, [rundownData?.showcallerState?.isPlaying, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      stopPolling();
      
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    };
  }, [stopPolling]);

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
    const segmentDuration = timeToSeconds(currentSegment.duration);
    const elapsedTime = Math.floor((Date.now() - showcallerState.playbackStartTime) / 1000);
    const remaining = Math.max(0, segmentDuration - elapsedTime);
    
    return remaining;
  })();

  // Use rundown data directly (no live state merging needed with polling)

  return {
    rundownData,
    currentTime,
    currentSegmentId,
    loading,
    error,
    timeRemaining
  };
};
