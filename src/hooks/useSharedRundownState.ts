
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

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
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatedTimeRemaining, setCalculatedTimeRemaining] = useState(0);

  // Enhanced refs for better real-time handling
  const lastUpdateTimestamp = useRef<string | null>(null);
  const lastShowcallerTimestamp = useRef<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const showcallerPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeSubscription = useRef<any>(null);
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

  // Enhanced real-time countdown with proper cleanup
  useEffect(() => {
    // Clear existing timer
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }

    if (!rundownData?.showcallerState?.isPlaying || !rundownData.showcallerState.currentSegmentId) {
      return;
    }

    countdownInterval.current = setInterval(() => {
      if (!mountedRef.current) {
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
        return;
      }
      
      const showcallerState = rundownData.showcallerState;
      const currentItem = rundownData.items.find(item => item.id === showcallerState.currentSegmentId);
      
      if (currentItem && currentItem.duration && showcallerState.playbackStartTime) {
        // Parse duration (e.g., "02:30" or "02:30:00") and calculate remaining time
        const durationParts = currentItem.duration.split(':').map(Number);
        let totalSeconds = 0;
        
        if (durationParts.length === 2) {
          totalSeconds = durationParts[0] * 60 + durationParts[1];
        } else if (durationParts.length === 3) {
          totalSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
        }
        
        // Calculate elapsed time since playback started
        const elapsed = Math.floor((Date.now() - showcallerState.playbackStartTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        
        setCalculatedTimeRemaining(remaining);
      }
    }, 1000);

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [rundownData?.showcallerState?.isPlaying, rundownData?.showcallerState?.currentSegmentId, rundownData?.showcallerState?.playbackStartTime, rundownData?.items]);

  // Optimized load function with better showcaller change detection
  const loadRundownData = useCallback(async (forceReload = false) => {
    if (!rundownId || isLoadingRef.current || !mountedRef.current) {
      return;
    }

    logger.log('📊 Loading rundown data for ID:', rundownId);
    isLoadingRef.current = true;

    try {
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, start_time, timezone, showcaller_state, created_at, updated_at, visibility')
        .eq('id', rundownId)
        .single();

      if (!mountedRef.current) return;

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('Rundown not found - it may be private or the ID is incorrect');
        } else if (queryError.message.includes('RLS')) {
          setError('This rundown is private and cannot be shared publicly');
        } else {
          setError(`Database error: ${queryError.message} (Code: ${queryError.code})`);
        }
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
            visibility: data.visibility || 'private'
          };
          
          logger.log('✅ Updated rundown data:', newRundownData.title, showcallerChanged ? '(showcaller changed)' : '(content changed)');
          setRundownData(newRundownData);
          lastUpdateTimestamp.current = data.updated_at;
          lastShowcallerTimestamp.current = JSON.stringify(data.showcaller_state);
        }
        setError(null);
      } else {
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      logger.error('💥 Network error loading rundown:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    isLoadingRef.current = false;
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [rundownId]);

  // Real-time subscription for immediate showcaller updates
  useEffect(() => {
    if (!rundownId || !mountedRef.current) return;

    // Clear existing subscription
    if (realtimeSubscription.current) {
      supabase.removeChannel(realtimeSubscription.current);
      realtimeSubscription.current = null;
    }

    logger.log('📺 Setting up real-time subscription for showcaller updates');

    const channel = supabase
      .channel(`shared-showcaller-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          if (!mountedRef.current) return;
          
          logger.log('📺 Received real-time update:', payload);
          
          // Immediately update if showcaller state changed
          if (payload.new?.showcaller_state) {
            const newShowcallerState = JSON.stringify(payload.new.showcaller_state);
            if (newShowcallerState !== lastShowcallerTimestamp.current) {
              logger.log('📺 Showcaller state changed via real-time, updating immediately');
              loadRundownData(true);
            }
          }
        }
      )
      .subscribe((status) => {
        logger.log('📺 Real-time subscription status:', status);
      });

    realtimeSubscription.current = channel;

    return () => {
      if (realtimeSubscription.current) {
        logger.log('📺 Cleaning up real-time subscription');
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }
    };
  }, [rundownId, loadRundownData]);

  // Initial load
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      loadRundownData();
    }
  }, [rundownId, loadRundownData]);

  // Enhanced polling system with much faster showcaller updates
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
      // Very fast polling for showcaller updates when playing (every 500ms)
      logger.log('🚀 Starting ultra-fast showcaller polling (500ms interval)');
      showcallerPollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        } else {
          if (showcallerPollingInterval.current) {
            clearInterval(showcallerPollingInterval.current);
            showcallerPollingInterval.current = null;
          }
        }
      }, 500); // Much faster for playing state
    } else {
      // Moderate polling for general updates when not playing (every 5 seconds)
      logger.log('📡 Starting moderate general polling (5s interval)');
      pollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        } else {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      }, 5000); // Faster than before even when not playing
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
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
      if (realtimeSubscription.current) {
        supabase.removeChannel(realtimeSubscription.current);
        realtimeSubscription.current = null;
      }
    };
  }, []);

  // Find the showcaller segment from showcaller_state or fallback to item status
  const currentSegmentId = rundownData?.showcallerState?.currentSegmentId || 
    rundownData?.items.find(item => 
      item.type !== 'header' && item.status === 'current'
    )?.id || null;

  return {
    rundownData,
    currentTime,
    currentSegmentId,
    loading,
    error,
    timeRemaining: calculatedTimeRemaining
  };
};
