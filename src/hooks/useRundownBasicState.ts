
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export const useRundownBasicState = () => {
  const params = useParams<{ id: string }>();
  // Filter out the literal ":id" string that sometimes comes from route patterns
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
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: setRundownTitleWithChange,
    rundownStartTime,
    setRundownStartTime: setRundownStartTimeWithChange,
    rundownId,
    markAsChanged
  };
};
