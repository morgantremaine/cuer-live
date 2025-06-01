
import { useState, useEffect, useRef } from 'react';
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
  
  const initRef = useRef(false);
  const lastRundownIdRef = useRef<string | undefined>(undefined);
  const isInitializedRef = useRef<{ [key: string]: boolean }>({});

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent multiple initializations with better checking
  useEffect(() => {
    const initKey = rundownId || 'new';
    
    // Skip if already initialized for this specific rundown
    if (isInitializedRef.current[initKey]) {
      return;
    }
    
    // Only initialize once per rundown change
    if (lastRundownIdRef.current !== rundownId) {
      lastRundownIdRef.current = rundownId;
      isInitializedRef.current[initKey] = true;
      initRef.current = true;
      
      console.log('useRundownBasicState initialized for rundownId:', rundownId);
    }
  }, [rundownId]);

  // Change tracking for timezone and other fields
  const markAsChanged = () => {
    // Reduced logging frequency
    console.log('Changes marked - triggering auto-save');
  };

  // Direct setters without change tracking (for initial load)
  const setTimezoneDirectly = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const setRundownTitleDirectly = (newTitle: string) => {
    setRundownTitle(newTitle);
  };

  // Change-tracking setters (for user interactions)
  const setTimezoneWithChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    markAsChanged();
  };

  const setRundownTitleWithChange = (newTitle: string) => {
    setRundownTitle(newTitle);
    markAsChanged();
  };

  const setRundownStartTimeWithChange = (newStartTime: string) => {
    setRundownStartTime(newStartTime);
    markAsChanged();
  };

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
    rundownId,
    markAsChanged
  };
};
