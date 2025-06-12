
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';

export const useSharedRundownState = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' ? undefined : rawId;
  
  const [rundownData, setRundownData] = useState<{
    id: string;
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
    timezone?: string;
    lastUpdated?: string;
    showcallerState?: any;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatedTimeRemaining, setCalculatedTimeRemaining] = useState(0);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate real-time countdown when showcaller is playing
  useEffect(() => {
    if (!rundownData?.showcallerState?.isPlaying || !rundownData.showcallerState.currentSegmentId) {
      return;
    }

    const timer = setInterval(() => {
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

  // Load rundown data with showcaller state
  const loadRundownData = async () => {
    if (!rundownId) {
      setLoading(false);
      setError('No rundown ID provided');
      return;
    }

    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, start_time, timezone, showcaller_state, created_at, updated_at')
        .eq('id', rundownId)
        .single();

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
        const newRundownData = {
          id: data.id,
          title: data.title || 'Untitled Rundown',
          items: data.items || [],
          columns: data.columns || [],
          startTime: data.start_time || '09:00:00',
          timezone: data.timezone || 'UTC',
          lastUpdated: data.updated_at,
          showcallerState: data.showcaller_state
        };
        
        // Only update if data has actually changed
        setRundownData(prev => {
          if (!prev || prev.lastUpdated !== newRundownData.lastUpdated) {
            return newRundownData;
          }
          return prev;
        });
        setError(null);
      } else {
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadRundownData();
  }, [rundownId]);

  // Set up more frequent polling for showcaller updates (every 500ms when playing, 2 seconds when not)
  useEffect(() => {
    if (!rundownId || loading) return;
    
    const isPlaying = rundownData?.showcallerState?.isPlaying;
    const pollInterval = setInterval(() => {
      loadRundownData();
    }, isPlaying ? 500 : 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [rundownId, loading, rundownData?.showcallerState?.isPlaying]);

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
