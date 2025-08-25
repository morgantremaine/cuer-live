import { useState, useRef, useCallback } from 'react';
import { useUniversalTimer } from './useUniversalTimer';

export const useLocalProcessingState = () => {
  const [isProcessingLocalStructural, setIsProcessingLocalStructural] = useState(false);
  const processingTimeoutRef = useRef<string | null>(null);
  const { setTimeout: setManagedTimeout, clearTimer } = useUniversalTimer('LocalProcessing');
  
  const markLocalStructuralChange = useCallback(() => {
    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimer(processingTimeoutRef.current);
    }
    
    // Show processing state immediately
    setIsProcessingLocalStructural(true);
    console.log('🔧 Local structural change - showing processing state');
    
    // Clear processing state after a brief delay
    processingTimeoutRef.current = setManagedTimeout(() => {
      setIsProcessingLocalStructural(false);
      console.log('✅ Local structural processing complete');
    }, 300); // Shorter delay for local changes
  }, [clearTimer, setManagedTimeout]);
  
  return {
    isProcessingLocalStructural,
    markLocalStructuralChange
  };
};