
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
  const [rundownIcon, setRundownIcon] = useState<string>('');
  
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
      console.log('useRundownBasicState initialized for rundownId:', rundownId);
      currentRundownRef.current = rundownId;
      initRef.current[currentKey] = true;
    }
  }, [rundownId]);

  // Change tracking for timezone and other fields - using useCallback for stable references
  const markAsChanged = useCallback(() => {
    console.log('Changes marked - triggering auto-save');
  }, []);

  // Direct setters without change tracking (for initial load) - using useCallback for stability
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

  const setRundownIconDirectly = useCallback((newIcon: string) => {
    console.log('useRundownBasicState: setRundownIconDirectly called with:', newIcon);
    setRundownIcon(newIcon);
  }, []);

  // Change-tracking setters (for user interactions) - using useCallback for stability
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

  const setRundownIconWithChange = useCallback((newIcon: string) => {
    console.log('useRundownBasicState: setRundownIconWithChange called with:', newIcon);
    setRundownIcon(newIcon);
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
    rundownIcon,
    setRundownIcon: setRundownIconWithChange,
    setRundownIconDirectly,
    rundownId,
    markAsChanged
  };
};
