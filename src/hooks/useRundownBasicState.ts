
import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Single initialization flag per rundown ID to prevent double initialization
  const initRef = useRef<string | undefined>(undefined);
  const hasInitialized = useRef(false);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize only once per rundown change - prevent double initialization
  useEffect(() => {
    if (rundownId !== initRef.current && !hasInitialized.current) {
      console.log('useRundownBasicState initialized for rundownId:', rundownId);
      initRef.current = rundownId;
      hasInitialized.current = true;
      setIsInitialized(true);
    }
  }, [rundownId]);

  // Reset initialization when rundown changes
  useEffect(() => {
    return () => {
      if (initRef.current !== rundownId) {
        hasInitialized.current = false;
      }
    };
  }, [rundownId]);

  // Stable change tracking function - memoized to prevent re-renders
  const markAsChanged = useCallback(() => {
    console.log('Changes marked - triggering auto-save');
  }, []);

  // Create stable setter functions that don't change reference
  const stableSetters = useRef({
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
  });

  // Update the stable setters when markAsChanged changes
  useEffect(() => {
    stableSetters.current.setTimezoneWithChange = (newTimezone: string) => {
      console.log('useRundownBasicState: setTimezoneWithChange called with:', newTimezone);
      setTimezone(newTimezone);
      markAsChanged();
    };
    stableSetters.current.setRundownTitleWithChange = (newTitle: string) => {
      setRundownTitle(newTitle);
      markAsChanged();
    };
    stableSetters.current.setRundownStartTimeWithChange = (newStartTime: string) => {
      setRundownStartTime(newStartTime);
      markAsChanged();
    };
  }, [markAsChanged]);

  return {
    currentTime,
    timezone,
    setTimezone: stableSetters.current.setTimezoneWithChange,
    setTimezoneDirectly: stableSetters.current.setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: stableSetters.current.setRundownTitleWithChange,
    setRundownTitleDirectly: stableSetters.current.setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime: stableSetters.current.setRundownStartTimeWithChange,
    setRundownStartTimeDirectly: stableSetters.current.setRundownStartTimeDirectly,
    rundownId,
    markAsChanged,
    isInitialized
  };
};
