
import React from 'react';
import RundownHeader from './RundownHeader';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useSearch } from '@/hooks/useSearch';

const RundownHeaderPropsAdapter = () => {
  const {
    currentTime,
    timezone,
    setTimezone,
    calculateTotalRuntime,
    hasUnsavedChanges,
    isSaving,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    items,
    visibleColumns,
    handleUndo,
    canUndo,
    lastAction,
    hasPendingUpdates,
    handleManualRefresh
  } = useRundownGridState();

  const { highlightMatch, replaceText, currentHighlight } = useSearch(items, visibleColumns);

  return (
    <RundownHeader
      currentTime={currentTime}
      timezone={timezone}
      onTimezoneChange={setTimezone}
      totalRuntime={calculateTotalRuntime()}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      title={rundownTitle}
      onTitleChange={setRundownTitle}
      rundownStartTime={rundownStartTime}
      onRundownStartTimeChange={setRundownStartTime}
      items={items}
      visibleColumns={visibleColumns}
      onHighlightMatch={highlightMatch}
      onReplaceText={replaceText}
      currentHighlight={currentHighlight}
      onUndo={handleUndo}
      canUndo={canUndo}
      lastAction={lastAction}
      hasPendingUpdates={hasPendingUpdates}
      onManualRefresh={handleManualRefresh}
    />
  );
};

export default RundownHeaderPropsAdapter;
