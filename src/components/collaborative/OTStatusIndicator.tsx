/**
 * OT Status Indicator
 * 
 * Shows when operational transform is active and handling collaborative editing
 */

import React from 'react';
import { useSimplifiedRundownState } from '@/hooks/useSimplifiedRundownState';

export const OTStatusIndicator: React.FC = () => {
  const { isOTEnabled, isCollaborative, activeSessions, activeConflicts } = useSimplifiedRundownState();

  if (!isOTEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isCollaborative ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <span>
          OT Active
          {activeSessions.length > 0 && ` • ${activeSessions.length} editing`}
          {activeConflicts.length > 0 && ` • ${activeConflicts.length} conflicts`}
        </span>
      </div>
    </div>
  );
};