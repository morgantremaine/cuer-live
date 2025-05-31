
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { RundownItem } from '@/types/rundown';
import { format } from 'date-fns';

export const useSharedRundownState = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
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

  // Load rundown data directly from Supabase (no auth required)
  useEffect(() => {
    const loadRundownData = async () => {
      if (!rundownId) {
        setLoading(false);
        setError('No rundown ID provided');
        return;
      }

      console.log('Loading shared rundown with ID:', rundownId);
      setError(null);

      try {
        // First try to get the rundown with public access
        const { data, error: queryError } = await supabase
          .from('rundowns')
          .select('id, title, items, columns, created_at, updated_at')
          .eq('id', rundownId)
          .single();

        console.log('Supabase query result:', { data, error: queryError });

        if (queryError) {
          console.error('Supabase error details:', queryError);
          setError(`Database error: ${queryError.message}`);
          setRundownData(null);
        } else if (data) {
          console.log('Successfully loaded shared rundown data:', data);
          setRundownData({
            title: data.title || 'Untitled Rundown',
            items: data.items || [],
            columns: data.columns || [],
            startTime: '09:00' // Default start time
          });
          setError(null);
        } else {
          console.log('No rundown found with ID:', rundownId);
          setError('Rundown not found');
          setRundownData(null);
        }
      } catch (error) {
        console.error('Error fetching rundown:', error);
        setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setRundownData(null);
      }

      setLoading(false);
    };

    loadRundownData();
  }, [rundownId]);

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
