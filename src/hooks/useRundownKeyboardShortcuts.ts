
import { useEffect } from 'react';

interface UseRundownKeyboardShortcutsProps {
  onAddRow: () => void;
  onAddHeader: () => void;
}

export const useRundownKeyboardShortcuts = ({
  onAddRow,
  onAddHeader
}: UseRundownKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Alt/Option key is pressed
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        
        if (event.shiftKey) {
          // Alt + Shift + N = Add Header
          onAddHeader();
        } else {
          // Alt + N = Add Row
          onAddRow();
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAddRow, onAddHeader]);
};
