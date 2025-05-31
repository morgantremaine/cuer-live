
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const useRundownBasicState = () => {
  const { id: rundownId } = useParams<{ id: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simple change tracking for now
  const markAsChanged = () => {
    // This will be handled by the auto-save system
    console.log('Changes marked');
  };

  return {
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged
  };
};
