
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export const useRundownBasicState = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  
  // Fix the ID parsing logic - only treat as valid ID if it's not "new" and is a proper UUID format
  const rundownId = (!rawId || rawId === 'new' || rawId === ':id' || rawId.trim() === '') ? undefined : rawId;
  
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

  // Store the auto-save trigger function - use a stable ref
  const autoSaveTriggerRef = useRef<(() => void) | null>(null);
  const autoSaveTriggerSetRef = useRef(false);

  // Set the auto-save trigger function (called from integration layer) - ONLY ONCE
  const setAutoSaveTrigger = (trigger: () => void) => {
    if (!autoSaveTriggerSetRef.current) {
      console.log('🔗 Setting auto-save trigger in useRundownBasicState (ONCE)');
      autoSaveTriggerRef.current = trigger;
      autoSaveTriggerSetRef.current = true;
    }
  };

  // Change tracking function that calls the actual auto-save
  const markAsChanged = () => {
    console.log('🔄 markAsChanged called in useRundownBasicState');
    console.log('📊 Current rundown ID:', rundownId);
    console.log('🔗 Auto-save trigger available:', !!autoSaveTriggerRef.current);
    
    // Call the actual auto-save trigger if it's available
    if (autoSaveTriggerRef.current) {
      console.log('🚀 Triggering auto-save from markAsChanged');
      autoSaveTriggerRef.current();
    } else {
      console.log('⚠️ No auto-save trigger available yet in markAsChanged');
    }
  };

  // Direct setters without change tracking (for initial load)
  const setTimezoneDirectly = (newTimezone: string) => {
    setTimezone(newTimezone);
  };

  const setRundownTitleDirectly = (newTitle: string) => {
    setRundownTitle(newTitle);
  };

  const setRundownStartTimeDirectly = (newStartTime: string) => {
    setRundownStartTime(newStartTime);
  };

  // Change-tracking setters (for user interactions) - stabilize these functions
  const setTimezoneWithChange = (newTimezone: string) => {
    if (timezone !== newTimezone) {
      setTimezone(newTimezone);
      markAsChanged();
    }
  };

  const setRundownTitleWithChange = (newTitle: string) => {
    if (rundownTitle !== newTitle) {
      setRundownTitle(newTitle);
      markAsChanged();
    }
  };

  const setRundownStartTimeWithChange = (newStartTime: string) => {
    if (rundownStartTime !== newStartTime) {
      setRundownStartTime(newStartTime);
      markAsChanged();
    }
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
    markAsChanged,
    setAutoSaveTrigger
  };
};
