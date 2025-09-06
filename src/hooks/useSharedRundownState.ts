
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';
import { useConsolidatedRealtimeRundown } from './useConsolidatedRealtimeRundown';
import { useRundownBroadcast } from './useRundownBroadcast';

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
  const [liveState, setLiveState] = useState<{
    items?: RundownItem[];
    title?: string;
    startTime?: string;
    timezone?: string;
  } | null>(null);

  // Pure realtime tracking refs (no polling)
  const lastDocVersion = useRef<number>(0);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

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

  // Pure realtime data loading function - only called on initial load or realtime updates
  const loadRundownData = useCallback(async (forceReload = false) => {
    if (!rundownId || isLoadingRef.current || !mountedRef.current) {
      return;
    }

    logger.debug(`Loading rundown data for ID: ${rundownId} (realtime-driven)`);
    isLoadingRef.current = true;

    try {
      // Use the RPC function that returns data for shared rundowns
      const { data, error: queryError } = await supabase
        .rpc('get_public_rundown_data', { rundown_uuid: rundownId });

      if (!mountedRef.current) return;

      if (queryError) {
        logger.error('Error loading rundown:', queryError);
        setError(`Database error: ${queryError.message}`);
        setRundownData(null);
      } else if (data) {
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
        
        logger.debug(`Updated rundown data: ${newRundownData.title} (realtime update)`);
        setRundownData(newRundownData);
        lastDocVersion.current = data.doc_version || 0;
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

  // Pure Supabase realtime subscription - handles all updates (content + showcaller)
  const { isConnected: realtimeConnected } = useConsolidatedRealtimeRundown({
    rundownId,
    onRundownUpdate: useCallback((updatedRundown) => {
      if (!mountedRef.current) return;
      
      logger.debug('Shared view received realtime update', {
        docVersion: updatedRundown?.doc_version,
        hasShowcaller: !!updatedRundown?.showcaller_state,
        timestamp: updatedRundown?.updated_at
      });
      
      const newDocVersion = updatedRundown?.doc_version || 0;
      const currentDocVersion = lastDocVersion.current;
      
      // Always process updates - either content changed OR showcaller changed
      if (newDocVersion !== currentDocVersion || updatedRundown?.showcaller_state) {
        logger.debug('Processing realtime update:', { 
          newVersion: newDocVersion, 
          currentVersion: currentDocVersion,
          updateType: newDocVersion > currentDocVersion ? 'content' : 'showcaller'
        });
        
        // Apply update immediately without re-fetching
        if (updatedRundown) {
          const newRundownData = {
            id: updatedRundown.id,
            title: updatedRundown.title || 'Untitled Rundown',
            items: updatedRundown.items || [],
            columns: updatedRundown.columns || [],
            startTime: updatedRundown.start_time || '09:00:00',
            timezone: updatedRundown.timezone || 'UTC',
            lastUpdated: updatedRundown.updated_at,
            showcallerState: updatedRundown.showcaller_state,
            visibility: updatedRundown.visibility,
            docVersion: updatedRundown.doc_version,
            lastUpdatedBy: updatedRundown.last_updated_by
          };
          
          setRundownData(newRundownData);
          lastDocVersion.current = newDocVersion;
          setError(null);
        }
      }
    }, []),
    onShowcallerUpdate: useCallback((updatedData) => {
      if (!mountedRef.current) return;
      
      logger.debug('Shared view received showcaller-only update');
      
      // Update showcaller state only
      setRundownData(prev => prev ? {
        ...prev,
        showcallerState: updatedData.showcaller_state,
        lastUpdated: updatedData.updated_at
      } : null);
    }, []),
    enabled: !!rundownId,
    isSharedView: true
  });

  // Live broadcast subscription for real-time typing updates
  useRundownBroadcast({
    rundownId,
    onLiveUpdate: useCallback((payload) => {
      if (!mountedRef.current) return;
      
      logger.debug('Shared view received live broadcast:', payload);
      
      // Update live state with broadcast data
      setLiveState(prev => ({
        ...prev,
        ...payload
      }));
    }, []),
    enabled: !!rundownId,
    isSharedView: true
  });

  // Initial load only - no polling needed with pure realtime
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      logger.debug('Initial load for shared rundown');
      loadRundownData();
    }
  }, [rundownId, loadRundownData]);

  // Clean, simple cleanup on unmount - no polling to clean up
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      // Clear time update interval only
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    };
  }, [rundownId]);

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

  // Merge database state with live broadcast state
  const mergedRundownData = rundownData ? {
    ...rundownData,
    // Override with live state if available
    items: liveState?.items || rundownData.items,
    title: liveState?.title || rundownData.title,
    startTime: liveState?.startTime || rundownData.startTime,
    timezone: liveState?.timezone || rundownData.timezone
  } : null;

  return {
    rundownData: mergedRundownData,
    currentTime,
    currentSegmentId,
    loading,
    error,
    timeRemaining
  };
};
