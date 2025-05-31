
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { format } from 'date-fns';

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
    lastUpdated?: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update current time every second
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
        .select('id, title, items, columns, created_at, updated_at')
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
          startTime: '09:00', // Default start time
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

  // Calculate current segment based on time
  useEffect(() => {
    if (!rundownData) return;

    const now = currentTime;
    const todayDateStr = format(now, 'yyyy-MM-dd');
    
    for (const item of rundownData.items) {
      // Skip headers when determining current segment
      if (item.type === 'header') continue;
      
      const startDateTime = new Date(`${todayDateStr}T${item.startTime}`);
      const endDateTime = new Date(`${todayDateStr}T${item.endTime}`);
      
      if (now >= startDateTime && now <= endDateTime) {
        setCurrentSegmentId(item.id);
        return;
      }
    }
    setCurrentSegmentId(null);
  }, [currentTime, rundownData]);

  return {
    rundownData,
    currentTime,
    currentSegmentId,
    loading,
    error
  };
};
