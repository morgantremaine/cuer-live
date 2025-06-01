
import { useEffect } from 'react';

interface UseGlobalKeyboardControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onForward: () => void;
  onBackward: () => void;
}

export const useGlobalKeyboardControls = ({
  isPlaying,
  onPlay,
  onPause,
  onForward,
  onBackward
}: UseGlobalKeyboardControlsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      // If user is typing, don't handle global shortcuts
      if (isTyping) {
        return;
      }

      // Check if any text is selected (which might indicate user is interacting with content)
      const hasTextSelection = window.getSelection()?.toString().length > 0;
      if (hasTextSelection) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            onPause();
          } else {
            onPlay();
          }
          break;
        case '=':
          e.preventDefault();
          onForward();
          break;
        case '-':
          e.preventDefault();
          onBackward();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, onPlay, onPause, onForward, onBackward]);
};
