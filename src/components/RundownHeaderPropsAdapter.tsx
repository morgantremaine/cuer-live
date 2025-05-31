
import React from 'react';
import RundownHeaderSection from './RundownHeaderSection';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownHeaderPropsAdapterProps {
  props: RundownContainerProps & {
    searchBar?: React.ReactNode;
  };
}

const RundownHeaderPropsAdapter = ({ props }: RundownHeaderPropsAdapterProps) => {
  return (
    <RundownHeaderSection
      currentTime={props.currentTime}
      timezone={props.timezone}
      onTimezoneChange={props.onTimezoneChange}
      totalRuntime={props.totalRuntime}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onShowColumnManager={() => props.setShowColumnManager(true)}
      selectedCount={props.selectedCount}
      hasClipboardData={props.hasClipboardData}
      onCopySelectedRows={props.onCopySelectedRows}
      onPasteRows={props.onPasteRows}
      onDeleteSelectedRows={props.onDeleteSelectedRows}
      onClearSelection={props.onClearSelection}
      selectedRowId={props.selectedRowId}
      isPlaying={props.isPlaying}
      currentSegmentId={props.currentSegmentId}
      timeRemaining={props.timeRemaining}
      onPlay={props.onPlay}
      onPause={props.onPause}
      onForward={props.onForward}
      onBackward={props.onBackward}
      hasUnsavedChanges={props.hasUnsavedChanges}
      isSaving={props.isSaving}
      rundownTitle={props.rundownTitle}
      onTitleChange={props.onTitleChange}
      rundownStartTime={props.rundownStartTime}
      onRundownStartTimeChange={props.onRundownStartTimeChange}
      rundownId={props.rundownId}
      onOpenTeleprompter={props.onOpenTeleprompter}
      searchBar={props.searchBar}
    />
  );
};

export default RundownHeaderPropsAdapter;
