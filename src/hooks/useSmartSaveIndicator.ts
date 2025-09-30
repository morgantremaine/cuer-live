import { useCallback, useEffect, useRef, useState } from 'react';

interface OperationQueueState {
  isProcessing: boolean;
  queueLength: number;
  lastSaved: Date | null;
  saveError: string | null;
}

interface SmartSaveState {
  isTyping: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  showSaved: boolean;
  lastSaved: Date | null;
  saveError: string | null;
}

interface UseSmartSaveIndicatorOptions {
  operationQueue: OperationQueueState;
  onKeystroke?: () => void;
}

/**
 * Enhanced save indicator that provides familiar UX states while maintaining
 * the robust operation-based system underneath.
 * 
 * State flow:
 * User Types → "Unsaved changes" (immediate)
 *     ↓
 * User Stops Typing (500ms) → "Saving..." (during network)
 *     ↓
 * Operations Complete → "Saved" (2s flash) → Hidden
 */
export const useSmartSaveIndicator = ({
  operationQueue,
  onKeystroke
}: UseSmartSaveIndicatorOptions) => {
  const [isTyping, setIsTyping] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastQueueLengthRef = useRef(0);
  const wasProcessingRef = useRef(false);
  
  // Track typing state with debounce
  const handleKeystroke = useCallback(() => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing state immediately
    if (!isTyping) {
      setIsTyping(true);
      setShowSaved(false); // Hide any saved indicator when typing starts
    }
    
    // Call external keystroke handler
    onKeystroke?.();
    
    // Set timeout to stop typing detection
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 500);
  }, [isTyping, onKeystroke]);
  
  // Monitor operation queue for save completion
  useEffect(() => {
    const currentQueueLength = operationQueue.queueLength;
    const isCurrentlyProcessing = operationQueue.isProcessing;
    
    // Detect when operations complete (queue empties and processing stops)
    const operationsJustCompleted = 
      wasProcessingRef.current && 
      !isCurrentlyProcessing && 
      currentQueueLength === 0 &&
      !isTyping &&
      !operationQueue.saveError;
    
    if (operationsJustCompleted) {
      // Show "Saved" for 2 seconds
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
    
    // Update refs for next comparison
    lastQueueLengthRef.current = currentQueueLength;
    wasProcessingRef.current = isCurrentlyProcessing;
  }, [
    operationQueue.queueLength, 
    operationQueue.isProcessing, 
    operationQueue.saveError,
    isTyping
  ]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // Compute smart save state
  const smartState: SmartSaveState = {
    isTyping,
    isSaving: !isTyping && operationQueue.isProcessing,
    hasUnsavedChanges: isTyping || operationQueue.queueLength > 0,
    showSaved,
    lastSaved: operationQueue.lastSaved,
    saveError: operationQueue.saveError
  };
  
  return {
    ...smartState,
    handleKeystroke
  };
};