
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
  
  // Single initialization flag per rundown ID
  const initRef = useRef<string | undefined>(undefined);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize only once per rundown change
  useEffect(() => {
    if (rundownId !== initRef.current) {
      console.log('useRundownBasicState initialized for rundownId:', rundownId);
      initRef.current = rundownId;
      
      // Clear any pending initialization
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      // Mark as initialized after a brief delay to ensure all hooks are ready
      initializationTimeoutRef.current = setTimeout(() => {
        setIsInitialized(true);
      }, 50);
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId]);

  // Memoized change tracking
  const markAsChanged = useCallback(() => {
    console.log('Changes marked - triggering auto-save');
  }, []);

  // Direct setters without change tracking (for initial load) - memoized
  const setTimezoneDirectly = useCallback((newTimezone: string) => {
    console.log('useRundownBasicState: setTimezoneDirectly called with:', newTimezone);
    setTimezone(newTimezone);
  }, []);

  const setRundownTitleDirectly = useCallback((newTitle: string) => {
    setRundownTitle(newTitle);
  }, []);

  const setRundownStartTimeDirectly = useCallback((newStartTime: string) => {
    setRundownStartTime(newStartTime);
  }, []);

  // Change-tracking setters (for user interactions) - memoized
  const setTimezoneWithChange = useCallback((newTimezone: string) => {
    console.log('useRundownBasicState: setTimezoneWithChange called with:', newTimezone);
    setTimezone(newTimezone);
    markAsChanged();
  }, [markAsChanged]);

  const setRundownTitleWithChange = useCallback((newTitle: string) => {
    setRundownTitle(newTitle);
    markAsChanged();
  }, [markAsChanged]);

  const setRundownStartTimeWithChange = useCallback((newStartTime: string) => {
    setRundownStartTime(newStartTime);
    markAsChanged();
  }, [markAsChanged]);

  return {
    currentTime,
    timezone,
    setTimezone: setTimezoneWithChange,
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: setRundownTitleWithChange,
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime: setRundownStartTimeWithChange,
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged,
    isInitialized
  };
};
