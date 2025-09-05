import { useCallback, useRef, useEffect } from 'react';

/**
 * Manages user intent detection across various interaction states
 * to prevent teammate updates from disrupting user actions
 */
export const useUserIntentManager = (
  selectedRows: Set<string>,
  editingCell: string | null,
  hasClipboardData: boolean,
  draggedItemIndex: number | null,
  hasUnsavedChanges: boolean,
  isTypingActive: () => boolean,
  setSelectionChecker?: (checker: () => boolean) => void,
  setEditingChecker?: (checker: () => boolean) => void,
  setClipboardChecker?: (checker: () => boolean) => void,
  setDragChecker?: (checker: () => boolean) => void
) => {
  const userIntentCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserActionRef = useRef<number>(0);
  
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
    
    // Clear any existing cooldown
    if (userIntentCooldownRef.current) {
      clearTimeout(userIntentCooldownRef.current);
    }
    
    // Set cooldown for 3 seconds after user action
    userIntentCooldownRef.current = setTimeout(() => {
      lastUserActionRef.current = 0;
    }, 3000);
  }, []);

  // Check if user recently performed an action
  const hasRecentUserActivity = useCallback(() => {
    return Date.now() - lastUserActionRef.current < 3000;
  }, []);

  // Comprehensive user intent detection
  const hasActiveUserIntent = useCallback(() => {
    return (
      isTypingActive() ||
      hasUnsavedChanges ||
      hasActiveSelection() ||
      isEditingCell() ||
      isDragActive() ||
      hasActiveClipboard() ||
      hasRecentUserActivity()
    );
  }, [
    isTypingActive,
    hasUnsavedChanges,
    hasActiveSelection,
    isEditingCell,
    isDragActive,
    hasActiveClipboard,
    hasRecentUserActivity
  ]);

  // Register checkers with realtime hook
  useEffect(() => {
    setSelectionChecker?.(hasActiveSelection);
    setEditingChecker?.(isEditingCell);
    setClipboardChecker?.(hasActiveClipboard);
    setDragChecker?.(isDragActive);
  }, [
    hasActiveSelection,
    isEditingCell,
    hasActiveClipboard,
    isDragActive,
    setSelectionChecker,
    setEditingChecker,
    setClipboardChecker,
    setDragChecker
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
    hasRecentUserActivity
  };
};