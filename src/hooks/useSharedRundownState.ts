
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
        // Try to access rundown without RLS enforcement
        const { data, error: queryError } = await supabase
          .from('rundowns')
          .select('id, title, items, columns, created_at, updated_at')
          .eq('id', rundownId)
          .single();

        console.log('Supabase query result:', { data, error: queryError });
        console.log('Query error details:', queryError);

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
        console.error('Network error fetching rundown:', error);
        setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setRundownData(null);
      }

      setLoading(false);
    };

    loadRundownData();
  }, [rundownId]);

  // Set up real-time subscription for rundown updates
  useEffect(() => {
    if (!rundownId) return;

    console.log('Setting up real-time subscription for rundown:', rundownId);

    // Create a unique channel for this rundown
    const channelName = `shared-rundown-${rundownId}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedRundown = payload.new;
            console.log('Updating rundown data with:', updatedRundown);
            
            setRundownData({
              title: updatedRundown.title || 'Untitled Rundown',
              items: updatedRundown.items || [],
              columns: updatedRundown.columns || [],
              startTime: '09:00' // Default start time
            });
          } else if (payload.eventType === 'DELETE') {
            console.log('Rundown was deleted');
            setError('This rundown has been deleted');
            setRundownData(null);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Real-time subscription status:', status);
        if (err) {
          console.error('Real-time subscription error:', err);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - retrying subscription...');
          // Optionally implement retry logic here
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(subscription);
    };
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
