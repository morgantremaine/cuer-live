
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
        return;
      }

      console.log('Loading shared rundown with ID:', rundownId);

      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('Error loading shared rundown:', error);
          setRundownData(null);
        } else if (data) {
          console.log('Loaded shared rundown data:', data);
          setRundownData({
            title: data.title,
            items: data.items || [],
            columns: data.columns || [],
            startTime: '09:00' // Default start time
          });
        } else {
          console.log('No rundown found with ID:', rundownId);
          setRundownData(null);
        }
      } catch (error) {
        console.error('Error fetching rundown:', error);
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
    loading
  };
};
