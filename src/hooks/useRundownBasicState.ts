
import { useState } from 'react';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useRundownBasicState = () => {
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York');
  const [rundownStartTime, setRundownStartTime] = useState('19:00');
  
  // Use change tracking with current state
  const changeTracking = useChangeTracking(
    [], // Items will be managed by state integration
    rundownTitle,
    undefined, // Columns will be managed by state integration
    timezone,
    rundownStartTime
  );

  // Direct setters that don't trigger change detection (for loading operations)
  const setRundownTitleDirectly = (title: string) => {
    changeTracking.setIsLoading(true);
    setRundownTitle(title);
    setTimeout(() => changeTracking.setIsLoading(false), 50);
  };

  const setTimezoneDirectly = (tz: string) => {
    changeTracking.setIsLoading(true);
    setTimezone(tz);
    setTimeout(() => changeTracking.setIsLoading(false), 50);
  };

  const setRundownStartTimeDirectly = (time: string) => {
    changeTracking.setIsLoading(true);
    setRundownStartTime(time);
    setTimeout(() => changeTracking.setIsLoading(false), 50);
  };

  // Change-tracking setters (for user interactions)
  const setRundownTitleWithChanges = (title: string) => {
    setRundownTitle(title);
    changeTracking.markAsChanged();
  };

  const setTimezoneWithChanges = (tz: string) => {
    setTimezone(tz);
    changeTracking.markAsChanged();
  };

  const setRundownStartTimeWithChanges = (time: string) => {
    setRundownStartTime(time);
    changeTracking.markAsChanged();
  };

  return {
    // State values
    rundownTitle,
    timezone,
    rundownStartTime,
    
    // Direct setters (for loading)
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    
    // Change-tracking setters (for user interactions)
    setRundownTitle: setRundownTitleWithChanges,
    setTimezone: setTimezoneWithChanges,
    setRundownStartTime: setRundownStartTimeWithChanges,
    
    // Change tracking
    ...changeTracking
  };
};
