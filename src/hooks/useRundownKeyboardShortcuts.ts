
import { useEffect, useCallback } from 'react';

interface UseRundownKeyboardShortcutsProps {
  canUndo: boolean;
  handleUndo: () => void;
}

export const useRundownKeyboardShortcuts = ({ canUndo, handleUndo }: UseRundownKeyboardShortcutsProps) => {
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
};
