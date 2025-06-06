
import { useState, useEffect, useRef } from 'react';

export const useEditingDetection = () => {
  const [isEditing, setIsEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(0);

  const markAsEditing = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    if (!isEditing) {
      setIsEditing(true);
      console.log('User started editing');
    }
    
    // Clear any existing timeout
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }

    // Set user as not editing after 3 seconds of inactivity
    editingTimeoutRef.current = setTimeout(() => {
      // Only stop editing if no activity happened since we set this timeout
      if (Date.now() - lastActivityRef.current >= 2800) {
        setIsEditing(false);
        console.log('User stopped editing');
      }
    }, 3000);
  };

  // Listen for various editing events
  useEffect(() => {
    const handleUserActivity = (event: Event) => {
      // Only consider actual user input events, not programmatic changes
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        markAsEditing();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only track actual text input, not navigation keys
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        markAsEditing();
      }
    };

    // Listen for specific user input events
    document.addEventListener('input', handleUserActivity);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handleUserActivity);

    return () => {
      document.removeEventListener('input', handleUserActivity);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handleUserActivity);
      
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  return { isEditing, markAsEditing };
};
