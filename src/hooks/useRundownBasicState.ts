
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

// Simplified global initialization tracker
let globalInitialized = new Set<string>();

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

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize only once per component mount
  useEffect(() => {
    const currentKey = rundownId || 'new';
    
    if (!initRef.current && !globalInitialized.has(currentKey)) {
      console.log('New rundown, using default title and timezone');
      initRef.current = true;
      globalInitialized.add(currentKey);
    }
  }, [rundownId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentKey = rundownId || 'new';
      globalInitialized.delete(currentKey);
      initRef.current = false;
    };
  }, [rundownId]);

  // Change tracking for timezone and other fields
  const markAsChanged = () => {
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
