
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

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent multiple initializations
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    console.log('useRundownBasicState initialized for rundownId:', rundownId);
  }, [rundownId]);

  // Change tracking for timezone and other fields
  const markAsChanged = () => {
    console.log('Changes marked - triggering auto-save');
  };

  // Direct setters without change tracking (for initial load)
  const setTimezoneDirectly = (newTimezone: string) => {
    console.log('Setting timezone directly:', newTimezone);
    setTimezone(newTimezone);
  };

  const setRundownTitleDirectly = (newTitle: string) => {
    console.log('Setting title directly:', newTitle);
    setRundownTitle(newTitle);
  };

  // Change-tracking setters (for user interactions)
  const setTimezoneWithChange = (newTimezone: string) => {
    console.log('Timezone changed to:', newTimezone);
    setTimezone(newTimezone);
    markAsChanged();
  };

  const setRundownTitleWithChange = (newTitle: string) => {
    console.log('Title changed to:', newTitle);
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
