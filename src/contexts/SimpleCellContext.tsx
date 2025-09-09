import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface SimpleCellContextType {
  markCellActive: (cellKey: string) => void;
  isCellActive: (cellKey: string) => boolean;
  getActiveCells: () => string[];
}

const SimpleCellContext = createContext<SimpleCellContextType | null>(null);

export const useSimpleCellTracking = () => {
  const context = useContext(SimpleCellContext);
  if (!context) {
    throw new Error('useSimpleCellTracking must be used within SimpleCellProvider');
  }
  return context;
};

interface SimpleCellProviderProps {
  children: ReactNode;
}

/**
 * SIMPLE CELL TRACKING CONTEXT
 * 
 * Tracks which cells are actively being typed in.
 * Used by the simplified collaboration system to protect active edits.
 */
export const SimpleCellProvider = ({ children }: SimpleCellProviderProps) => {
  const activeCellsRef = useRef<Set<string>>(new Set());
  const cellTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const markCellActive = useCallback((cellKey: string) => {
    // Add to active set
    activeCellsRef.current.add(cellKey);
    
    // Clear existing timeout
    const existingTimeout = cellTimeoutsRef.current.get(cellKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to clear after typing stops
    const timeout = setTimeout(() => {
      activeCellsRef.current.delete(cellKey);
      cellTimeoutsRef.current.delete(cellKey);
    }, 1000); // 1 second after last keystroke
    
    cellTimeoutsRef.current.set(cellKey, timeout);
  }, []);

  const isCellActive = useCallback((cellKey: string) => {
    return activeCellsRef.current.has(cellKey);
  }, []);

  const getActiveCells = useCallback(() => {
    return Array.from(activeCellsRef.current);
  }, []);

  const value = {
    markCellActive,
    isCellActive,
    getActiveCells
  };

  return (
    <SimpleCellContext.Provider value={value}>
      {children}
    </SimpleCellContext.Provider>
  );
};