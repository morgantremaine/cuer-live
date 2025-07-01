
// Centralized header numbering utility for consistent header labeling across the application
export const generateHeaderLabel = (index: number): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  if (index < 0) return 'A';
  
  if (index < alphabet.length) {
    // Standard A-Z for indices 0-25
    return alphabet[index];
  }
  
  // For indices beyond Z (26+), use AA, BB, CC, DD... pattern
  // This matches the pattern used in clipboard operations
  const firstLetter = Math.floor(index / alphabet.length) - 1;
  const secondLetter = index % alphabet.length;
  
  if (firstLetter >= 0 && firstLetter < alphabet.length) {
    return alphabet[firstLetter] + alphabet[secondLetter];
  }
  
  // For very large indices, fall back to repeating pattern
  return alphabet[index % alphabet.length] + alphabet[index % alphabet.length];
};

// Helper function to check if we need rows before first header adjustment
export const checkRowsBeforeFirstHeader = (items: any[]): boolean => {
  const firstHeaderIndex = items.findIndex(item => 
    item.type === 'header' || (item && typeof item === 'object' && 'type' in item && item.type === 'header')
  );
  return firstHeaderIndex > 0;
};
