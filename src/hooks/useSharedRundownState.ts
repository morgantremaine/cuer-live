
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';

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

  // Refs to prevent excessive polling
  const lastUpdateTimestamp = useRef<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const showcallerPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (mountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate real-time countdown when showcaller is playing
  useEffect(() => {
    if (!rundownData?.showcallerState?.isPlaying || !rundownData.showcallerState.currentSegmentId) {
      return;
    }

    const timer = setInterval(() => {
      if (!mountedRef.current) return;
      
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

    return () => clearInterval(timer);
  }, [rundownData?.showcallerState?.isPlaying, rundownData?.showcallerState?.currentSegmentId, rundownData?.showcallerState?.playbackStartTime, rundownData?.items]);

  // Optimized load function with better caching
  const loadRundownData = useCallback(async () => {
    if (!rundownId || isLoadingRef.current || !mountedRef.current) {
      return;
    }

    console.log('📊 Loading rundown data for ID:', rundownId);
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
        // Only update if data has actually changed (compare timestamps)
        if (lastUpdateTimestamp.current !== data.updated_at) {
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
          
          console.log('✅ Successfully loaded rundown data:', newRundownData.title);
          setRundownData(newRundownData);
          lastUpdateTimestamp.current = data.updated_at;
        }
        setError(null);
      } else {
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.error('💥 Network error loading rundown:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    isLoadingRef.current = false;
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [rundownId]);

  // Initial load - only once
  useEffect(() => {
    if (rundownId && mountedRef.current) {
      loadRundownData();
    }
  }, [rundownId, loadRundownData]);

  // Dual polling system - fast for showcaller, slow for everything else
  useEffect(() => {
    if (!rundownId || loading || !rundownData) return;
    
    // Clear any existing intervals
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    if (showcallerPollingInterval.current) {
      clearInterval(showcallerPollingInterval.current);
    }
    
    const isPlaying = rundownData?.showcallerState?.isPlaying;
    
    if (isPlaying) {
      // Fast polling for showcaller updates (every 2 seconds when playing)
      console.log('🚀 Starting fast showcaller polling (2s interval)');
      showcallerPollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        }
      }, 2000);
    } else {
      // Slower polling for general updates (every 30 seconds when not playing)
      console.log('🐌 Starting slow general polling (30s interval)');
      pollingInterval.current = setInterval(() => {
        if (mountedRef.current) {
          loadRundownData();
        }
      }, 30000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (showcallerPollingInterval.current) {
        clearInterval(showcallerPollingInterval.current);
      }
    };
  }, [rundownId, loading, rundownData?.showcallerState?.isPlaying, loadRundownData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (showcallerPollingInterval.current) {
        clearInterval(showcallerPollingInterval.current);
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
