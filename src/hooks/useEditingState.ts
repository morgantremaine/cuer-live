
import { useState, useCallback, useRef } from 'react';

export const useEditingState = () => {
  const [isEditing, setIsEditing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const markAsEditing = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      console.log('🖊️ User started editing');
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to stop editing after 3 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      setIsEditing(false);
      console.log('✋ User stopped editing');
    }, 3000);
  }, [isEditing]);

  return {
    isEditing,
    markAsEditing
  };
};
