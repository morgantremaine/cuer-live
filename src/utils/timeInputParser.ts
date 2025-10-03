/**
 * Parse time input that can be in either 12-hour or 24-hour format
 * Always returns 24-hour format (HH:MM:SS) for internal storage
 */

export const parseTimeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '00:00:00';

  // Clean the input - remove extra spaces
  let cleaned = input.trim().toUpperCase();
  
  // Detect if this is 12-hour format (contains AM or PM)
  const is12Hour = /AM|PM/i.test(cleaned);
  
  if (is12Hour) {
    // Parse 12-hour format
    // Remove AM/PM and clean up
    const ampm = cleaned.includes('PM') ? 'PM' : 'AM';
    cleaned = cleaned.replace(/AM|PM/gi, '').trim();
    
    // Split by colon
    const parts = cleaned.split(':').map(p => p.trim());
    
    if (parts.length < 2) return '00:00:00';
    
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    
    // Validate
    if (isNaN(hours) || hours < 1 || hours > 12) return '00:00:00';
    if (minutes < 0 || minutes > 59) return '00:00:00';
    if (seconds < 0 || seconds > 59) return '00:00:00';
    
    // Convert to 24-hour
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    // Parse 24-hour format
    cleaned = cleaned.replace(/[^0-9:]/g, '');
    const parts = cleaned.split(':');
    
    if (parts.length < 1) return '00:00:00';
    
    let hours = parseInt(parts[0], 10) || 0;
    let minutes = parseInt(parts[1], 10) || 0;
    let seconds = parseInt(parts[2], 10) || 0;
    
    // Validate and clamp
    hours = Math.min(23, Math.max(0, hours));
    minutes = Math.min(59, Math.max(0, minutes));
    seconds = Math.min(59, Math.max(0, seconds));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};

/**
 * Validate if input looks like it's in progress of being typed
 * Returns true if we should allow the current input
 */
export const isValidTimeInput = (input: string): boolean => {
  if (!input) return true;
  
  // Allow partial 12-hour format: digits, colons, spaces, A, M, P
  if (/^[0-9:\sAMPamp]*$/i.test(input)) return true;
  
  // Allow partial 24-hour format: digits and colons
  if (/^[0-9:]*$/.test(input)) return true;
  
  return false;
};
