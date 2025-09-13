import React, { createContext, useContext, ReactNode } from 'react';
import { useBulletproofAutoSave, AutoSaveHooks } from '@/hooks/core/useBulletproofAutoSave';
import { ComponentType } from '@/hooks/core/useComponentSpecificSync';

interface UnifiedAutoSaveContextType extends AutoSaveHooks {
  componentType: ComponentType;
  rundownId: string;
}

const UnifiedAutoSaveContext = createContext<UnifiedAutoSaveContextType | null>(null);

export const useUnifiedAutoSave = () => {
  const context = useContext(UnifiedAutoSaveContext);
  if (!context) {
    throw new Error('useUnifiedAutoSave must be used within UnifiedAutoSaveProvider');
  }
  return context;
};

interface UnifiedAutoSaveProviderProps {
  children: ReactNode;
  rundownId: string;
  componentType: ComponentType;
  onDataUpdate?: (data: any) => void;
  onConflictDetected?: (conflict: any) => void;
  onSaveComplete?: (success: boolean) => void;
}

export const UnifiedAutoSaveProvider: React.FC<UnifiedAutoSaveProviderProps> = ({
  children,
  rundownId,
  componentType,
  onDataUpdate,
  onConflictDetected,
  onSaveComplete
}) => {
  const autoSaveHooks = useBulletproofAutoSave(rundownId, componentType, {
    onDataUpdate,
    onConflictDetected,
    onSaveComplete
  });

  const contextValue: UnifiedAutoSaveContextType = {
    ...autoSaveHooks,
    componentType,
    rundownId
  };

  return (
    <UnifiedAutoSaveContext.Provider value={contextValue}>
      {children}
    </UnifiedAutoSaveContext.Provider>
  );
};