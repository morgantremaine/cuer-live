
import { useState, useEffect, useRef } from 'react';

export const useEditingDetection = () => {
  const [isEditing, setIsEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout>();

  const markAsEditing = () => {
    setIsEditing(true);
    
    // Clear any existing timeout
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }

    // Set user as not editing after 2 seconds of inactivity
    editingTimeoutRef.current = setTimeout(() => {
      setIsEditing(false);
    }, 2000);
  };

  // Listen for various editing events
  useEffect(() => {
    const handleUserActivity = () => {
      markAsEditing();
    };

    // Listen for keyboard and mouse events that indicate editing
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('input', handleUserActivity);
    document.addEventListener('click', handleUserActivity);

    return () => {
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('input', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  return { isEditing, markAsEditing };
};
