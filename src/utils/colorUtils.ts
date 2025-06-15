
export const getContrastTextColor = (backgroundColor: string): string => {
  if (!backgroundColor) return '';
  
  // Handle different color formats
  let hex = backgroundColor;
  
  // Convert named colors or other formats to hex if needed
  if (backgroundColor.startsWith('#')) {
    hex = backgroundColor;
  } else if (backgroundColor.startsWith('rgb')) {
    // For now, assume hex colors are being used
    return '#000000'; // Default to black for non-hex colors
  } else {
    return '#000000'; // Default to black for unknown formats
  }
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-character hex codes
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance using the standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Use a more conservative threshold for better readability
  // Return black text for light backgrounds, white text for dark backgrounds
  return luminance > 0.6 ? '#000000' : '#ffffff';
};
