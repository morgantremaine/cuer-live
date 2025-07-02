
import React from 'react';
import { BlueprintList } from '@/types/blueprint';
import BlueprintListCard from './BlueprintListCard';
import { useBlueprintDragDrop } from '@/hooks/blueprint/useBlueprintDragDrop';

interface BlueprintListsGridProps {
  lists: BlueprintList[];
  setLists: (lists: BlueprintList[]) => void;
  saveBlueprint: (lists: BlueprintList[], silent?: boolean, showDateOverride?: string, notesOverride?: string, crewDataOverride?: any, cameraPlots?: any, componentOrder?: string[]) => void;
  getCurrentComponentOrder: () => string[];
  onEditList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, text: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onEditItem: (listId: string, itemId: string, newText: string) => void;
}

export const BlueprintListsGrid: React.FC<BlueprintListsGridProps> = ({
  lists,
  setLists,
  saveBlueprint,
  getCurrentComponentOrder,
  onEditList,
  onDeleteList,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onEditItem
}) => {
  const {
    draggedListId,
    insertionIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useBlueprintDragDrop(lists, setLists, saveBlueprint, getCurrentComponentOrder);

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {lists.map((list, index) => (
        <div key={list.id}>
          {insertionIndex === index && (
            <div className="h-1 bg-blue-500 rounded mb-4 transition-all duration-200" />
          )}
          <BlueprintListCard
            list={list}
            onEdit={() => onEditList(list.id)}
            onDelete={() => onDeleteList(list.id)}
            onToggleItem={onToggleItem}
            onAddItem={onAddItem}
            onDeleteItem={onDeleteItem}
            onEditItem={onEditItem}
            isDragging={draggedListId === list.id}
            onDragStart={(e) => handleDragStart(e, list.id)}
            onDragEnter={(e) => handleDragEnterContainer(e, index)}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
      {insertionIndex === lists.length && (
        <div className="h-1 bg-blue-500 rounded mb-4 transition-all duration-200" />
      )}
    </div>
  );
};
