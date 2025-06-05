
import { useEffect, useCallback } from 'react';

interface UseRundownGridKeyboardHandlersProps {
  canUndo: boolean;
  handleUndo: () => void;
}

export const useRundownGridKeyboardHandlers = ({
  canUndo,
  handleUndo
}: UseRundownGridKeyboardHandlersProps) => {
  
  // Keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, canUndo]);

  return {};
};
