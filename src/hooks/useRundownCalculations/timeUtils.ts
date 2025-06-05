
export const timeToSeconds = (timeStr: string | undefined | null): number => {
  // Handle null, undefined, or empty string values
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  // Handle both MM:SS and HH:MM:SS formats
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    // MM:SS format (minutes:seconds)
    const [minutes, seconds] = parts;
    return (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return (isNaN(hours) ? 0 : hours) * 3600 + (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
  }
  return 0;
};

export const secondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};
