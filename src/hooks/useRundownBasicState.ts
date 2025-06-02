
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const useRundownBasicState = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Single initialization per app instance
  const hasInitialized = useRef(false);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize only once per app lifecycle
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log('useRundownBasicState initialized for rundownId:', rundownId);
      hasInitialized.current = true;
      setIsInitialized(true);
    }
  }, [rundownId]);

  // Stable change tracking function
  const markAsChanged = useCallback(() => {
    console.log('Changes marked - triggering auto-save');
  }, []);

  // Create truly stable setter functions using useMemo
  const stableSetters = useMemo(() => ({
    setTimezoneDirectly: (newTimezone: string) => {
      console.log('useRundownBasicState: setTimezoneDirectly called with:', newTimezone);
      setTimezone(newTimezone);
    },
    setRundownTitleDirectly: (newTitle: string) => {
      setRundownTitle(newTitle);
    },
    setRundownStartTimeDirectly: (newStartTime: string) => {
      setRundownStartTime(newStartTime);
    },
    setTimezoneWithChange: (newTimezone: string) => {
      console.log('useRundownBasicState: setTimezoneWithChange called with:', newTimezone);
      setTimezone(newTimezone);
      markAsChanged();
    },
    setRundownTitleWithChange: (newTitle: string) => {
      setRundownTitle(newTitle);
      markAsChanged();
    },
    setRundownStartTimeWithChange: (newStartTime: string) => {
      setRundownStartTime(newStartTime);
      markAsChanged();
    }
  }), [markAsChanged]);

  return {
    currentTime,
    timezone,
    setTimezone: stableSetters.setTimezoneWithChange,
    setTimezoneDirectly: stableSetters.setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: stableSetters.setRundownTitleWithChange,
    setRundownTitleDirectly: stableSetters.setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime: stableSetters.setRundownStartTimeWithChange,
    setRundownStartTimeDirectly: stableSetters.setRundownStartTimeDirectly,
    rundownId,
    markAsChanged,
    isInitialized
  };
};
