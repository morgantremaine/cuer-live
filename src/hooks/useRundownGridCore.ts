
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseRundownGridCoreProps {
  markAsChanged: () => void;
  rundownTitle: string;
  timezone: string;
  rundownStartTime: string;
  setRundownTitleDirectly: (title: string) => void;
  setTimezoneDirectly: (timezone: string) => void;
  setRundownStartTimeDirectly: (startTime: string) => void; // Add this prop
  isProcessingRealtimeUpdate: boolean;
}

export const useRundownGridCore = ({
  markAsChanged,
  rundownTitle,
  timezone,
  rundownStartTime,
  setRundownTitleDirectly,
  setTimezoneDirectly,
  setRundownStartTimeDirectly, // Receive from parent
  isProcessingRealtimeUpdate
}: UseRundownGridCoreProps) => {
  const params = useParams<{ id: string }>();
  const rundownId = (!params.id || params.id === 'new' || params.id === ':id' || params.id.trim() === '') ? undefined : params.id;
  
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const stateIntegration = useRundownStateIntegration(
    markAsChanged,
    rundownTitle,
    timezone,
    rundownStartTime,
    setRundownTitleDirectly,
    setTimezoneDirectly,
    isProcessingRealtimeUpdate
  );

  const { savedRundowns, loading } = useRundownStorage();

  // Data loading with proper direct setters
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    handleLoadLayout: stateIntegration.handleLoadLayout,
    setItems: stateIntegration.setItems,
    onRundownLoaded: (rundown) => {
      console.log('✅ Rundown loaded successfully:', rundown.title);
    }
  });

  const {
    isConnected,
    isProcessingUpdate,
    setApplyingRemoteUpdate
  } = useStableRealtimeCollaboration(
    rundownId,
    stateIntegration.items,
    stateIntegration.setItems,
    stateIntegration.updateSavedSignature,
    rundownTitle,
    stateIntegration.columns,
    timezone,
    rundownStartTime
  );

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateEndTime = useCallback((startTime: string, duration: string): string => {
    try {
      const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
      const [durationHours, durationMinutes, durationSeconds] = duration.split(':').map(Number);
      
      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, startSeconds, 0);
      
      const endDate = new Date(startDate.getTime() + 
        (durationHours * 3600 + durationMinutes * 60 + durationSeconds) * 1000);
      
      return endDate.toTimeString().slice(0, 8);
    } catch (error) {
      return startTime;
    }
  }, []);

  const calculateTotalRuntime = useCallback((): string => {
    if (!stateIntegration.items || stateIntegration.items.length === 0) return '00:00:00';
    
    let totalSeconds = 0;
    stateIntegration.items.forEach(item => {
      if (item.type === 'item' && item.duration) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalSeconds += hours * 3600 + minutes * 60 + seconds;
      }
    });
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [stateIntegration.items]);

  return {
    ...stateIntegration,
    currentSegmentId,
    setCurrentSegmentId,
    currentTime,
    setCurrentTime,
    calculateEndTime,
    calculateTotalRuntime,
    isConnected,
    isProcessingRealtimeUpdate: isProcessingUpdate,
    setApplyingRemoteUpdate
  };
};
