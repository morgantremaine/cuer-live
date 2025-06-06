
import { useState, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownBasicState = () => {
  const [currentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback((
    items: RundownItem[], 
    title: string, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string
  ) => {
    setHasUnsavedChanges(false);
  }, []);

  const setRundownTitleDirectly = useCallback((title: string) => {
    setRundownTitle(title);
  }, []);

  const setTimezoneDirectly = useCallback((newTimezone: string) => {
    setTimezone(newTimezone);
  }, []);

  const setRundownStartTimeDirectly = useCallback((time: string) => {
    setRundownStartTime(time);
  }, []);

  return {
    currentTime,
    timezone,
    setTimezone: useCallback((newTimezone: string) => {
      setTimezone(newTimezone);
      markAsChanged();
    }, [markAsChanged]),
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: useCallback((title: string) => {
      setRundownTitle(title);
      markAsChanged();
    }, [markAsChanged]),
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime: useCallback((time: string) => {
      setRundownStartTime(time);
      markAsChanged();
    }, [markAsChanged]),
    setRundownStartTimeDirectly,
    hasUnsavedChanges,
    markAsChanged,
    markAsSaved
  };
};
