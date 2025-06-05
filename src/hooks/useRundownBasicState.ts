
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
  
  // Single initialization flag per app session
  const initRef = useRef<{ [key: string]: boolean }>({});
  const currentRundownRef = useRef<string | undefined>(undefined);

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize only once per rundown change - use a more robust check
  useEffect(() => {
    const currentKey = rundownId || 'new';
    
    // Only initialize if this is truly a new rundown
    if (currentRundownRef.current !== rundownId && !initRef.current[currentKey]) {
      currentRundownRef.current = rundownId;
      initRef.current[currentKey] = true;
    }
  }, [rundownId]);

  // Change tracking for timezone and other fields
  const markAsChanged = () => {
    // Removed console.log to reduce noise
  };

  // Direct setters without change tracking (for initial load)
  const setTimezoneDirectly = (newTimezone: string) => {
    console.log('Basic state: Setting timezone directly to:', newTimezone);
    setTimezone(newTimezone);
  };

  const setRundownTitleDirectly = (newTitle: string) => {
    console.log('Basic state: Setting title directly to:', newTitle);
    setRundownTitle(newTitle);
  };

  const setRundownStartTimeDirectly = (newStartTime: string) => {
    console.log('Basic state: Setting start time directly to:', newStartTime);
    setRundownStartTime(newStartTime);
  };

  // Change-tracking setters (for user interactions)
  const setTimezoneWithChange = (newTimezone: string) => {
    console.log('Basic state: Setting timezone with change tracking to:', newTimezone);
    setTimezone(newTimezone);
    markAsChanged();
  };

  const setRundownTitleWithChange = (newTitle: string) => {
    console.log('Basic state: Setting title with change tracking to:', newTitle);
    setRundownTitle(newTitle);
    markAsChanged();
  };

  const setRundownStartTimeWithChange = (newStartTime: string) => {
    console.log('Basic state: Setting start time with change tracking to:', newStartTime);
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
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged
  };
};
