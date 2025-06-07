import { useState, useEffect, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useTimeCalculations = (
  items: RundownItem[],
  rundownStartTime: string,
  timezone: string
) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const calculateEndTime = useCallback((startTime: string, duration: string): string => {
    if (!startTime || !duration) return '';
    
    try {
      // Parse start time (HH:MM:SS format)
      const [startHours, startMinutes, startSeconds = 0] = startTime.split(':').map(Number);
      
      // Parse duration (MM:SS or HH:MM:SS format)
      const durationParts = duration.split(':').map(Number);
      let durationHours = 0, durationMinutes = 0, durationSeconds = 0;
      
      if (durationParts.length === 2) {
        [durationMinutes, durationSeconds] = durationParts;
      } else if (durationParts.length === 3) {
        [durationHours, durationMinutes, durationSeconds] = durationParts;
      }
      
      // Calculate end time
      const totalStartSeconds = startHours * 3600 + startMinutes * 60 + startSeconds;
      const totalDurationSeconds = durationHours * 3600 + durationMinutes * 60 + durationSeconds;
      const totalEndSeconds = totalStartSeconds + totalDurationSeconds;
      
      const endHours = Math.floor(totalEndSeconds / 3600);
      const endMinutes = Math.floor((totalEndSeconds % 3600) / 60);
      const endSecondsRemainder = totalEndSeconds % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:${endSecondsRemainder.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  }, []);

  const getRowStatus = useCallback((item: RundownItem, currentTime: Date) => {
    // This is a placeholder implementation
    // In a real application, you'd compare the current time with the item's start/end times
    return 'upcoming' as 'upcoming' | 'current' | 'completed';
  }, []);

  return {
    currentTime,
    calculateEndTime,
    getRowStatus
  };
};
