/**
 * Cell Edit Indicator
 * Shows when other users are editing a field
 */

import React from 'react';
import { EditSession } from '@/lib/operationalTransform/types';
import { useCollaborativeStore } from '@/stores/collaborativeState';

interface CellEditIndicatorProps {
  targetId: string;
  field: string;
  className?: string;
}

export const CellEditIndicator: React.FC<CellEditIndicatorProps> = ({
  targetId,
  field,
  className = ''
}) => {
  const activeSessions = useCollaborativeStore(state => 
    state.activeSessions.filter(session => 
      session.targetId === targetId && 
      session.field === field &&
      Date.now() - session.lastActivity < 30000 // Active within 30 seconds
    )
  );

  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {activeSessions.map((session, index) => (
        <div
          key={`${session.userId}-${index}`}
          className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
          title={`User ${session.userId} is editing`}
        />
      ))}
      <span className="text-xs text-blue-600 ml-1">
        {activeSessions.length} editing
      </span>
    </div>
  );
};