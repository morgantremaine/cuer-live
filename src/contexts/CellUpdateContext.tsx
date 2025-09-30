import React, { createContext, useContext, useRef, ReactNode } from 'react';

interface CellUpdateContextType {
  cellUpdateInProgressRef: React.MutableRefObject<boolean>;
  showcallerOperationRef: React.MutableRefObject<boolean>;
  setCellUpdateInProgress: (inProgress: boolean) => void;
  setShowcallerOperation: (inProgress: boolean) => void;
}

const CellUpdateContext = createContext<CellUpdateContextType | undefined>(undefined);

export const useCellUpdateContext = () => {
  const context = useContext(CellUpdateContext);
  if (!context) {
    throw new Error('useCellUpdateContext must be used within a CellUpdateProvider');
  }
  return context;
};

interface CellUpdateProviderProps {
  children: ReactNode;
}

export const CellUpdateProvider = ({ children }: CellUpdateProviderProps) => {
  const cellUpdateInProgressRef = useRef<boolean>(false);
  const showcallerOperationRef = useRef<boolean>(false);

  const setCellUpdateInProgress = (inProgress: boolean) => {
    cellUpdateInProgressRef.current = inProgress;
    if (inProgress) {
      console.log('🔒 Cell broadcast update started - AutoSave blocked');
    } else {
      console.log('🔓 Cell broadcast update finished - AutoSave unblocked');
    }
  };

  const setShowcallerOperation = (inProgress: boolean) => {
    showcallerOperationRef.current = inProgress;
    if (inProgress) {
      console.log('📺 Showcaller operation started - AutoSave coordination active');
    } else {
      console.log('📺 Showcaller operation finished - AutoSave coordination cleared');
    }
  };

  const value: CellUpdateContextType = {
    cellUpdateInProgressRef,
    showcallerOperationRef,
    setCellUpdateInProgress,
    setShowcallerOperation
  };

  return (
    <CellUpdateContext.Provider value={value}>
      {children}
    </CellUpdateContext.Provider>
  );
};