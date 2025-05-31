
import { useState, useEffect } from 'react';

export const useRundownBasicState = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    currentTime,
    timezone,
    setTimezone,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime
  };
};
