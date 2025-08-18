import React from 'react';
import { ConflictIndicatorDisplay } from './ConflictIndicatorDisplay';

interface ConflictPanelProps {
  conflictIndicators: Array<{
    id: string;
    type: 'field' | 'structural' | 'timing';
    severity: 'low' | 'medium' | 'high';
    message: string;
    affectedItems: string[];
    timestamp: string;
    resolved: boolean;
    resolutionStrategy?: string;
  }>;
  onResolveConflict?: (conflictId: string, strategy: string) => void;
  onClearResolved?: () => void;
  className?: string;
}

export const ConflictPanel: React.FC<ConflictPanelProps> = ({
  conflictIndicators,
  onResolveConflict,
  onClearResolved,
  className = ''
}) => {
  if (conflictIndicators.length === 0) {
    return null;
  }

  return (
    <div className={`bg-background border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Collaboration Conflicts
      </h3>
      
      <ConflictIndicatorDisplay
        conflicts={conflictIndicators}
        onResolveConflict={onResolveConflict}
        onClearResolved={onClearResolved}
      />
    </div>
  );
};