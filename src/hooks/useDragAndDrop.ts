
import { useState, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useDragAndDrop = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  selectedRows: Set<string>
) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    const item = items[index];
    const isSelected = selectedRows.has(item.id);
    
    setDraggedItemIndex(index);
    setIsDraggingMultiple(isSelected && selectedRows.size > 1);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, [items, selectedRows]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetIndex !== undefined) {
      setDropTargetIndex(targetIndex);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedItemIndex === null) return;

    const sourceIndex = draggedItemIndex;
    
    if (sourceIndex === targetIndex) return;

    setItems(prevItems => {
      const newItems = [...prevItems];
      
      if (isDraggingMultiple) {
        // Get all selected items and their indices
        const selectedItems = newItems.filter(item => selectedRows.has(item.id));
        const selectedIndices = selectedItems.map(item => 
          newItems.findIndex(i => i.id === item.id)
        ).sort((a, b) => a - b);
        
        // Remove selected items (in reverse order to maintain indices)
        selectedIndices.reverse().forEach(index => {
          newItems.splice(index, 1);
        });
        
        // Calculate new insertion point
        let insertIndex = targetIndex;
        selectedIndices.forEach(originalIndex => {
          if (originalIndex < targetIndex) {
            insertIndex--;
          }
        });
        
        // Insert all selected items at the new position
        selectedItems.forEach((item, i) => {
          newItems.splice(insertIndex + i, 0, item);
        });
      } else {
        // Single item drag
        const [draggedItem] = newItems.splice(sourceIndex, 1);
        const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newItems.splice(insertIndex, 0, draggedItem);
      }
      
      return newItems;
    });

    setDraggedItemIndex(null);
    setDropTargetIndex(null);
    setIsDraggingMultiple(false);
  }, [draggedItemIndex, isDraggingMultiple, selectedRows, setItems]);

  return {
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
