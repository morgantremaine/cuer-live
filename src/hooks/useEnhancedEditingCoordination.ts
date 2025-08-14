import { useState, useCallback, useRef, useEffect } from 'react';

interface FieldEditSession {
  fieldKey: string;
  itemId: string;
  startTime: number;
  lastActivity: number;
}

interface UseEnhancedEditingCoordinationProps {
  onEditingStateChange?: (isEditing: boolean, fieldKey?: string) => void;
}

export const useEnhancedEditingCoordination = ({
  onEditingStateChange
}: UseEnhancedEditingCoordinationProps = {}) => {
  const [activeEditSessions, setActiveEditSessions] = useState<Map<string, FieldEditSession>>(new Map());
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Enhanced field editing tracking
  const startFieldEdit = useCallback((itemId: string, field: string) => {
    const fieldKey = `${itemId}-${field}`;
    const now = Date.now();
    
    setActiveEditSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.set(fieldKey, {
        fieldKey,
        itemId,
        startTime: now,
        lastActivity: now
      });
      return newSessions;
    });
    
    // Notify of editing state change
    onEditingStateChange?.(true, fieldKey);
    
    console.log('🖊️ Started editing field:', fieldKey);
  }, [onEditingStateChange]);
  
  // Update activity timestamp for ongoing edit
  const updateFieldActivity = useCallback((itemId: string, field: string) => {
    const fieldKey = `${itemId}-${field}`;
    const now = Date.now();
    
    setActiveEditSessions(prev => {
      const session = prev.get(fieldKey);
      if (session) {
        const newSessions = new Map(prev);
        newSessions.set(fieldKey, {
          ...session,
          lastActivity: now
        });
        return newSessions;
      }
      return prev;
    });
  }, []);
  
  // End field editing session
  const endFieldEdit = useCallback((itemId: string, field: string) => {
    const fieldKey = `${itemId}-${field}`;
    
    setActiveEditSessions(prev => {
      const newSessions = new Map(prev);
      newSessions.delete(fieldKey);
      return newSessions;
    });
    
    console.log('✋ Ended editing field:', fieldKey);
  }, []);
  
  // Check if a specific field is being edited recently
  const isFieldRecentlyEdited = useCallback((itemId: string, field: string, withinMs: number = 5000) => {
    const fieldKey = `${itemId}-${field}`;
    const session = activeEditSessions.get(fieldKey);
    
    if (!session) return false;
    
    const now = Date.now();
    return (now - session.lastActivity) < withinMs;
  }, [activeEditSessions]);
  
  // Check if any field is currently being edited
  const hasActiveEditing = useCallback(() => {
    return activeEditSessions.size > 0;
  }, [activeEditSessions]);
  
  // Set preparing save state
  const setPreparingSave = useCallback((preparing: boolean) => {
    setIsPreparingSave(preparing);
    console.log(preparing ? '📝 Preparing to save - blocking realtime updates' : '✅ Save preparation complete');
  }, []);
  
  // Get all currently edited fields
  const getEditedFields = useCallback(() => {
    return Array.from(activeEditSessions.values());
  }, [activeEditSessions]);
  
  // Cleanup inactive sessions periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const sessionTimeout = 8000; // 8 seconds
      
      setActiveEditSessions(prev => {
        const newSessions = new Map();
        let hasChanges = false;
        
        for (const [key, session] of prev) {
          if ((now - session.lastActivity) < sessionTimeout) {
            newSessions.set(key, session);
          } else {
            hasChanges = true;
            console.log('🧹 Cleaning up inactive edit session:', key);
          }
        }
        
        return hasChanges ? newSessions : prev;
      });
      
      // Notify if no more active editing
      if (activeEditSessions.size === 0) {
        onEditingStateChange?.(false);
      }
    };
    
    // Clean up every 2 seconds
    cleanupTimeoutRef.current = setInterval(cleanup, 2000);
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [activeEditSessions.size, onEditingStateChange]);
  
  return {
    // Edit session management
    startFieldEdit,
    updateFieldActivity,
    endFieldEdit,
    
    // State queries
    isFieldRecentlyEdited,
    hasActiveEditing,
    isPreparingSave,
    
    // Save coordination
    setPreparingSave,
    
    // Data access
    getEditedFields,
    activeEditSessionCount: activeEditSessions.size
  };
};