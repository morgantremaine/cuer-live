
import React from 'react';
import RundownHeader from './RundownHeader';

interface RundownHeaderPropsAdapterProps {
  rundownTitle: string;
  rundownStartTime: string;
  timezone: string;
  currentTime: Date;
  setTitle: (title: string) => void;
  setStartTime: (startTime: string) => void;
  setTimezone: (timezone: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  lastAction: string | null;
  findReplaceState?: any;
}

const RundownHeaderPropsAdapter = ({ 
  rundownTitle, 
  rundownStartTime, 
  timezone, 
  currentTime, 
  setTitle, 
  setStartTime, 
  setTimezone,
  onUndo,
  canUndo,
  lastAction,
  findReplaceState
}: RundownHeaderPropsAdapterProps) => {
  return (
    <RundownHeader
      title={rundownTitle}
      start_time={rundownStartTime}
      timezone={timezone}
      currentTime={currentTime}
      onTitleChange={setTitle}
      onStartTimeChange={setStartTime}
      onTimezoneChange={setTimezone}
      onUndo={onUndo}
      canUndo={canUndo}
      lastAction={lastAction}
      findReplaceState={findReplaceState}
    />
  );
};

export default RundownHeaderPropsAdapter;

