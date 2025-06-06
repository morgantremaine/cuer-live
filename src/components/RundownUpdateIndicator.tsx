
import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface RundownUpdateIndicatorProps {
  hasRemoteUpdates: boolean;
  hasConflict: boolean;
  onClearIndicator: () => void;
}

const RundownUpdateIndicator = ({ 
  hasRemoteUpdates, 
  hasConflict, 
  onClearIndicator 
}: RundownUpdateIndicatorProps) => {
  if (!hasRemoteUpdates && !hasConflict) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-all duration-300 ${
      hasConflict 
        ? 'bg-orange-100 border border-orange-300 text-orange-800' 
        : 'bg-green-100 border border-green-300 text-green-800'
    }`}>
      {hasConflict ? (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            Remote changes detected. Save your work first.
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">
            Rundown updated by collaborator
          </span>
        </>
      )}
      <button
        onClick={onClearIndicator}
        className="ml-2 text-xs hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
};

export default RundownUpdateIndicator;
