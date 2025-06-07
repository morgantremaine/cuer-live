
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const useRundownBasicState = () => {
  const params = useParams<{ id: string }>();
  const [currentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get rundown ID from URL params, ensuring it's properly tracked
  const rundownId = params.id || undefined;

  // Direct setters for realtime updates that bypass change tracking
  const setRundownTitleDirectly = useCallback((title: string) => {
    setRundownTitle(title);
  }, []);

  const setTimezoneDirectly = useCallback((tz: string) => {
    setTimezone(tz);
  }, []);

  const setRundownStartTimeDirectly = useCallback((time: string) => {
    setRundownStartTime(time);
  }, []);

  const markAsChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Enhanced setters that trigger change tracking
  const setRundownTitleWithChange = useCallback((title: string) => {
    if (title !== rundownTitle) {
      setRundownTitle(title);
      markAsChanged();
    }
  }, [rundownTitle, markAsChanged]);

  const setTimezoneWithChange = useCallback((tz: string) => {
    if (tz !== timezone) {
      setTimezone(tz);
      markAsChanged();
    }
  }, [timezone, markAsChanged]);

  const setRundownStartTimeWithChange = useCallback((time: string) => {
    if (time !== rundownStartTime) {
      setRundownStartTime(time);
      markAsChanged();
    }
  }, [rundownStartTime, markAsChanged]);

  // Debug logging for rundown ID changes
  useEffect(() => {
    console.log('🆔 Rundown ID changed:', rundownId);
  }, [rundownId]);

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
    rundownId, // This now properly reflects the URL param
    markAsChanged,
    hasChanges
  };
};
