
import { useCallback } from 'react';

export const useCellAutoResize = () => {
  const autoResize = useCallback((target: HTMLTextAreaElement, newValue?: string) => {
    const textToMeasure = newValue !== undefined ? newValue : target.value;
    
    // Reset height to auto to get accurate scrollHeight
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    
    // Determine if we need multiple lines based on content
    const hasLineBreaks = textToMeasure.includes('\n');
    const isLongText = textToMeasure.length > 40;
    
    if (hasLineBreaks || isLongText) {
      // Allow up to 2 lines (48px max)
      target.style.height = Math.min(scrollHeight, 48) + 'px';
    } else {
      // Single line height
      target.style.height = '24px';
    }
  }, []);

  return { autoResize };
};
