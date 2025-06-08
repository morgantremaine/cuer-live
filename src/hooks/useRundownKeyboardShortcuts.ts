
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
    console.log('🎹 Setting up keyboard shortcuts');
    
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('🎹 Key pressed:', {
        key: event.key,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey
      });
      
      // Check if Alt/Option key is pressed
      if (event.altKey && event.key.toLowerCase() === 'n') {
        console.log('🎹 Alt+N detected!');
        event.preventDefault();
        
        if (event.shiftKey) {
          // Alt + Shift + N = Add Header
          console.log('🎹 Adding header');
          onAddHeader();
        } else {
          // Alt + N = Add Row
          console.log('🎹 Adding row');
          onAddRow();
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);
    console.log('🎹 Keyboard event listener attached');

    // Cleanup
    return () => {
      console.log('🎹 Removing keyboard event listener');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAddRow, onAddHeader]);
};
