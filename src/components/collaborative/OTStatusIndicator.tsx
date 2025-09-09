/**
 * OT Status Indicator - Only shows in Blueprint context
 * 
 * Shows when operational transform is active and handling collaborative editing
 */

import React from 'react';

interface OTStatusIndicatorProps {
  rundownId: string;
  rundownTitle: string;
}

export const OTStatusIndicator: React.FC<OTStatusIndicatorProps> = ({ rundownId, rundownTitle }) => {
  // For now, just show a simple indicator since OT is integrated
  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span>Collaborative Mode</span>
      </div>
    </div>
  );
};