
import React from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import BlueprintListCard from './BlueprintListCard';

interface BlueprintListsGridProps {
  lists: BlueprintList[];
  rundownItems: RundownItem[];
  draggedListId: string | null;
  insertionIndex: number | null;
  onDeleteList: (listId: string) => void;
  onRenameList: (listId: string, newName: string) => void;
  onUpdateCheckedItems: (listId: string, checkedItems: Record<string, boolean>) => void;
  onDragStart: (e: React.DragEvent, listId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnterContainer: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  allItems: Array<{
    type: 'list' | 'crew-list' | 'scratchpad';
    id: string;
    data: BlueprintList | null;
  }>;
}

const BlueprintListsGrid = ({
  lists,
  rundownItems,
  draggedListId,
  insertionIndex,
  onDeleteList,
  onRenameList,
  onUpdateCheckedItems,
  onDragStart,
  onDragOver,
  onDragEnterContainer,
  onDragLeave,
  onDrop,
  onDragEnd,
  allItems
}: BlueprintListsGridProps) => {
  const renderListItem = (item: any, index: number) => {
    if (item.type !== 'list') return null;
    
    const list = item.data;
    const isBeingDragged = draggedListId === item.id;
    const showDropIndicator = insertionIndex === index && draggedListId !== null;

    return (
      <React.Fragment key={list.id}>
        {showDropIndicator && (
          <div className="h-1 bg-blue-500 rounded-full mb-4 break-inside-avoid animate-pulse" />
        )}
        
        <div className="break-inside-avoid mb-6">
          <BlueprintListCard
            list={list}
            index={index}
            rundownItems={rundownItems}
            onDelete={onDeleteList}
            onRename={onRenameList}
            onUpdateCheckedItems={onUpdateCheckedItems}
            isDragging={isBeingDragged}
            onDragStart={onDragStart}
            onDragEnterContainer={onDragEnterContainer}
            onDragEnd={onDragEnd}
          />
        </div>
      </React.Fragment>
    );
  };

  return (
    <div 
      className="columns-2 gap-6 relative"
      data-drop-container
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {allItems.map((item, index) => renderListItem(item, index))}
      
      {/* Final drop indicator for regular lists only */}
      {insertionIndex === lists.length && draggedListId && lists.some(list => list.id === draggedListId) && (
        <div className="h-1 bg-blue-500 rounded-full mb-4 break-inside-avoid animate-pulse" />
      )}
    </div>
  );
};

export default BlueprintListsGrid;
