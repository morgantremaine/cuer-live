
import React from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import BlueprintListCard from './BlueprintListCard';
import CrewList from './CrewList';
import BlueprintScratchpad from './BlueprintScratchpad';

interface BlueprintUnifiedGridProps {
  lists: BlueprintList[];
  rundownItems: RundownItem[];
  rundownId: string;
  rundownTitle: string;
  savedBlueprint: any;
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

const BlueprintUnifiedGrid = ({
  lists,
  rundownItems,
  rundownId,
  rundownTitle,
  savedBlueprint,
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
}: BlueprintUnifiedGridProps) => {
  // Create unified items array including lists, crew list, and scratchpad
  const allItems = [
    ...lists.map(list => ({ type: 'list' as const, id: list.id, data: list })),
    { type: 'crew-list' as const, id: 'crew-list', data: null },
    { type: 'scratchpad' as const, id: 'scratchpad', data: null }
  ];

  const renderItem = (item: typeof allItems[0], index: number) => {
    const isBeingDragged = draggedListId === item.id;
    const showDropIndicator = insertionIndex === index && draggedListId !== null;

    return (
      <React.Fragment key={item.id}>
        {showDropIndicator && (
          <div className="w-full mb-4">
            <div className="h-1 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
        
        {item.type === 'list' && (
          <div className="break-inside-avoid mb-6">
            <BlueprintListCard
              list={item.data!}
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
        )}
        
        {item.type === 'crew-list' && (
          <div className="w-full mb-6 break-inside-avoid">
            <CrewList 
              rundownId={rundownId}
              rundownTitle={rundownTitle}
              isDragging={isBeingDragged}
              onDragStart={onDragStart}
              onDragEnterContainer={(e) => onDragEnterContainer(e, index)}
              onDragEnd={onDragEnd}
            />
          </div>
        )}
        
        {item.type === 'scratchpad' && (
          <div className="w-full mb-6 break-inside-avoid">
            <BlueprintScratchpad
              rundownId={rundownId}
              rundownTitle={rundownTitle}
              initialNotes={savedBlueprint?.notes || ''}
              isDragging={isBeingDragged}
              onDragStart={onDragStart}
              onDragEnterContainer={(e) => onDragEnterContainer(e, index)}
              onDragEnd={onDragEnd}
              onNotesChange={(notes) => {
                // Notes are automatically handled by the component
              }}
            />
          </div>
        )}
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
      {allItems.map((item, index) => renderItem(item, index))}
      
      {/* Final drop indicator */}
      {insertionIndex === allItems.length && draggedListId && (
        <div className="w-full mb-4">
          <div className="h-1 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default BlueprintUnifiedGrid;
