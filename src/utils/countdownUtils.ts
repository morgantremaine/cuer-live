export const parseTargetDateTime = (time: string, date: string, is24Hour: boolean): Date => {
  const targetDate = new Date(date);
  const timeParts = time.split(':').map(Number);
  
  let hours = timeParts[0];
  const minutes = timeParts[1] || 0;
  const seconds = timeParts[2] || 0;
  
  // Convert 12-hour to 24-hour if needed
  if (!is24Hour && time.toLowerCase().includes('pm') && hours !== 12) {
    hours += 12;
  } else if (!is24Hour && time.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }
  
  targetDate.setHours(hours, minutes, seconds, 0);
  return targetDate;
};

export const formatTimeRemaining = (ms: number, showMilliseconds: boolean = false) => {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  const milliseconds = showMilliseconds ? Math.floor((ms % 1000) / 10) : 0;
  
  return { hours, minutes, seconds, milliseconds };
};

export const getClockColorClass = (secondsRemaining: number): string => {
  if (secondsRemaining <= 0) return 'text-red-600';
  if (secondsRemaining <= 30) return 'text-red-500';
  if (secondsRemaining <= 60) return 'text-red-400';
  if (secondsRemaining <= 300) return 'text-orange-400';
  return 'text-green-500';
};

export const getBackgroundTintClass = (secondsRemaining: number): string => {
  if (secondsRemaining <= 30) return 'bg-red-950/30';
  if (secondsRemaining <= 60) return 'bg-orange-950/20';
  if (secondsRemaining <= 300) return 'bg-yellow-950/10';
  return '';
};

export const shouldPulse = (secondsRemaining: number): boolean => {
  return secondsRemaining > 0 && secondsRemaining <= 30;
};

export const getQuickPresetTime = (preset: string): Date => {
  const now = new Date();
  switch (preset) {
    case '15min':
      return new Date(now.getTime() + 15 * 60 * 1000);
    case '30min':
      return new Date(now.getTime() + 30 * 60 * 1000);
    case '1hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    default:
      return now;
  }
};
