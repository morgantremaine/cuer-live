
import React, { useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtime } from '@/hooks/useRealtime';
import { useRundown } from '@/hooks/useRundown';
import { useTime } from '@/hooks/useTime';
import { useUndo } from '@/hooks/useUndo';
import { RundownHeader } from './RundownHeader';

interface RundownHeaderPropsAdapterProps {
  rundownId?: string;
  isShared?: boolean;
  canEdit?: boolean;
  onSearchClick?: () => void;
}

const RundownHeaderPropsAdapter = ({ 
  rundownId, 
  isShared = false, 
  canEdit = true,
  onSearchClick
}: RundownHeaderPropsAdapterProps) => {
  const { id: routeRundownId } = useParams<{ id: string }>();
  const activeRundownId = rundownId || routeRundownId;
  
  const { 
    currentTime, 
    timezone, 
    onTimezoneChange 
  } = useTime();
  
  const { 
    rundown, 
    lastAction 
  } = useRundown(activeRundownId, { realtime: true });
  
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndo(activeRundownId);

  return (
    <RundownHeader 
      rundown={rundown}
      currentTime={currentTime}
      timezone={timezone}
      onTimezoneChange={onTimezoneChange}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      lastAction={lastAction}
      isShared={isShared}
      canEdit={canEdit}
      onSearchClick={onSearchClick}
    />
  );
};

export default RundownHeaderPropsAdapter;
