
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { format } from 'date-fns';

export const useSharedRundownState = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();
  const [rundownData, setRundownData] = useState<{
    title: string;
    items: RundownItem[];
    columns: any[];
    startTime: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load rundown data
  useEffect(() => {
    if (loading || !rundownId) return;

    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (rundown) {
      setRundownData({
        title: rundown.title,
        items: rundown.items || [],
        columns: rundown.columns || [],
        startTime: rundown.startTime || '09:00'
      });
    }
  }, [rundownId, savedRundowns, loading]);

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
