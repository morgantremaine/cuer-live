import React from 'react';
import { useRundown } from '@/hooks/useRundown';
import { useShowcallerIntegration } from '@/hooks/useShowcallerIntegration';
import { RundownMainContent } from './RundownMainContent';
import { useTeleprompter } from '@/hooks/useTeleprompter';

interface RundownMainPropsAdapterProps {
  rundownId: string;
  autoScroll?: boolean;
}

const RundownMainPropsAdapter = ({ rundownId, autoScroll }: RundownMainPropsAdapterProps) => {
  const { 
    rundown, 
    items, 
    loading, 
    error, 
    updateItem, 
    createItem, 
    deleteItem, 
    moveItem,
    isMutating,
    isReordering
  } = useRundown(rundownId);
  
  const { currentSegmentId } = useShowcallerIntegration(rundownId);
  const { isTeleprompterOpen, openTeleprompter, closeTeleprompter } = useTeleprompter();

  if (loading) {
    return <div className="p-4">Loading rundown content...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!rundown || !items) {
    return <div className="p-4">Rundown not found.</div>;
  }

  return (
    <RundownMainContent
      rundown={rundown}
      items={items}
      currentSegmentId={currentSegmentId}
      updateItem={updateItem}
      createItem={createItem}
      deleteItem={deleteItem}
      moveItem={moveItem}
      isMutating={isMutating}
      isReordering={isReordering}
      isTeleprompterOpen={isTeleprompterOpen}
      openTeleprompter={openTeleprompter}
      closeTeleprompter={closeTeleprompter}
      autoScroll={autoScroll}
    />
  );
};

export default RundownMainPropsAdapter;
