import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Enhanced user intent manager that properly tracks all user activities
 * and provides robust protection against teammate disruption
 */
export const useEnhancedUserIntentManager = (
  selectedRows: Set<string>,
  editingCell: string | null,
  hasClipboardData: boolean,
  draggedItemIndex: number | null,
  hasUnsavedChanges: boolean,
  isTypingActive: () => boolean
) => {
  const userIntentCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserActionRef = useRef<number>(0);
  const [isProtected, setIsProtected] = useState(false);
  
  // Enhanced selection checker
  const hasActiveSelection = useCallback(() => {
    return selectedRows.size > 0;
  }, [selectedRows]);

  // Cell editing checker
  const isEditingCell = useCallback(() => {
    return editingCell !== null;
  }, [editingCell]);

  // Clipboard checker
  const hasActiveClipboard = useCallback(() => {
    return hasClipboardData;
  }, [hasClipboardData]);

  // Drag operation checker
  const isDragActive = useCallback(() => {
    return draggedItemIndex !== null;
  }, [draggedItemIndex]);

  // User activity tracker - extends cooldown after each user action
  const markUserActivity = useCallback(() => {
    lastUserActionRef.current = Date.now();
    setIsProtected(true);
    
    // Clear any existing cooldown
    if (userIntentCooldownRef.current) {
      clearTimeout(userIntentCooldownRef.current);
    }
    
    // Set cooldown for 3 seconds after user action
    userIntentCooldownRef.current = setTimeout(() => {
      lastUserActionRef.current = 0;
      setIsProtected(false);
    }, 3000);
  }, []);

  // Check if user recently performed an action
  const hasRecentUserActivity = useCallback(() => {
    return Date.now() - lastUserActionRef.current < 3000;
  }, []);

  // Comprehensive user intent detection
  const hasActiveUserIntent = useCallback(() => {
    const intent = (
      isTypingActive() ||
      hasUnsavedChanges ||
      hasActiveSelection() ||
      isEditingCell() ||
      isDragActive() ||
      hasActiveClipboard() ||
      hasRecentUserActivity()
    );
    
    if (intent && !isProtected) {
      setIsProtected(true);
    }
    
    return intent;
  }, [
    isTypingActive,
    hasUnsavedChanges,
    hasActiveSelection,
    isEditingCell,
    isDragActive,
    hasActiveClipboard,
    hasRecentUserActivity,
    isProtected
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (userIntentCooldownRef.current) {
        clearTimeout(userIntentCooldownRef.current);
      }
    };
  }, []);

  return {
    hasActiveUserIntent,
    markUserActivity,
    hasActiveSelection,
    isEditingCell,
    isDragActive,
    hasActiveClipboard,
    hasRecentUserActivity,
    isProtected
  };
};