
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';

export const useSharedRundownState = () => {
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
  const rawId = params.id;
  const rundownId = rawId === ':id' ? undefined : rawId;
  
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
    timezone?: string;
    lastUpdated?: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update current time every second (for display purposes only)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data with bypass for RLS
  const loadRundownData = async () => {
    if (!rundownId) {
      setLoading(false);
      setError('No rundown ID provided');
      return;
    }

    console.log('Loading shared rundown with ID:', rundownId);
    setError(null);

    try {
      // Try to access rundown without RLS enforcement
      const { data, error: queryError } = await supabase
        .from('rundowns')
        .select('id, title, items, columns, start_time, timezone, created_at, updated_at')
        .eq('id', rundownId)
        .single();

      console.log('Supabase query result:', { data, error: queryError });

      if (queryError) {
        // Handle different types of errors
        if (queryError.code === 'PGRST116') {
          setError('Rundown not found - it may be private or the ID is incorrect');
        } else if (queryError.message.includes('RLS')) {
          setError('This rundown is private and cannot be shared publicly');
        } else {
          setError(`Database error: ${queryError.message} (Code: ${queryError.code})`);
        }
        setRundownData(null);
      } else if (data) {
        console.log('Successfully loaded shared rundown data:', data);
        const newRundownData = {
          title: data.title || 'Untitled Rundown',
          items: data.items || [],
          columns: data.columns || [],
          startTime: data.start_time || '09:00:00',
          timezone: data.timezone || 'UTC',
          lastUpdated: data.updated_at
        };
        
        // Only update if data has actually changed
        setRundownData(prev => {
          if (!prev || prev.lastUpdated !== newRundownData.lastUpdated) {
            console.log('Rundown data updated:', newRundownData.lastUpdated);
            return newRundownData;
          }
          return prev;
        });
        setError(null);
      } else {
        console.log('No rundown found with ID:', rundownId);
        setError('Rundown not found');
        setRundownData(null);
      }
    } catch (error) {
      console.error('Network error fetching rundown:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRundownData(null);
    }

    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadRundownData();
  }, [rundownId]);

  // Set up polling for updates (check every 5 seconds)
  useEffect(() => {
    if (!rundownId || loading) return;

    console.log('Setting up polling for rundown updates:', rundownId);
    
    const pollInterval = setInterval(() => {
      console.log('Polling for rundown updates...');
      loadRundownData();
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [rundownId, loading]);

  // Find the showcaller segment (the one marked as 'current' by the main rundown)
  const currentSegmentId = rundownData?.items.find(item => item.status === 'current')?.id || null;

  return {
    rundownData,
    currentTime,
    currentSegmentId, // This will be null unless set by showcaller in main rundown
    loading,
    error
  };
};
