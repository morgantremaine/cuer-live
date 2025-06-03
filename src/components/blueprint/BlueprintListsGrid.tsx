
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
  onDragEnd
}: BlueprintListsGridProps) => {
  return (
    <div 
      className="columns-2 gap-6 relative"
      data-drop-container
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {lists.map((list, index) => (
        <React.Fragment key={list.id}>
          {/* Insertion line at the top */}
          {insertionIndex === index && (
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
              isDragging={draggedListId === list.id}
              onDragStart={onDragStart}
              onDragEnterContainer={onDragEnterContainer}
              onDragEnd={onDragEnd}
            />
          </div>
          
          {/* Insertion line at the bottom if it's the last item */}
          {insertionIndex === lists.length && index === lists.length - 1 && (
            <div className="h-1 bg-blue-500 rounded-full mt-4 break-inside-avoid animate-pulse" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BlueprintListsGrid;
