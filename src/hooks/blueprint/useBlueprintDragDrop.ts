
import { useState, useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintDragDrop = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  saveBlueprint: (lists: BlueprintList[], silent?: boolean, showDateOverride?: string, notesOverride?: string, crewDataOverride?: any, cameraPlots?: any, componentOrder?: string[]) => void,
  initialComponentOrder: string[] = ['crew-list', 'camera-plot', 'scratchpad']
) => {
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [componentOrder, setComponentOrder] = useState<string[]>(initialComponentOrder);

  const handleDragStart = useCallback((e: React.DragEvent, listId: string) => {
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnterContainer = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      // For larger components, handle their reordering
      if (draggedListId === 'crew-list' || draggedListId === 'camera-plot' || draggedListId === 'scratchpad') {
        setInsertionIndex(index);
        return;
      }

      const draggedIndex = lists.findIndex(list => list.id === draggedListId);
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const elementCenter = rect.top + rect.height / 2;
      
      let targetIndex = index;
      if (mouseY > elementCenter) {
        targetIndex = index + 1;
      }
      
      if (draggedIndex !== -1 && draggedIndex < targetIndex) {
        targetIndex -= 1;
      }
      
      setInsertionIndex(targetIndex);
    }
  }, [draggedListId, lists]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = document.querySelector('[data-drop-container]');
    if (container && !container.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle special components reordering
    if (draggedId === 'crew-list' || draggedId === 'camera-plot' || draggedId === 'scratchpad') {
      const newOrder = [...componentOrder];
      const draggedIndex = newOrder.indexOf(draggedId);
      
      if (draggedIndex !== -1) {
        // Remove from current position
        newOrder.splice(draggedIndex, 1);
        
        // Calculate insertion position relative to component order
        let targetPosition = insertionIndex - lists.length - 1;
        if (targetPosition < 0) targetPosition = 0;
        if (targetPosition > newOrder.length) targetPosition = newOrder.length;
        
        // Insert at new position
        newOrder.splice(targetPosition, 0, draggedId);
        setComponentOrder(newOrder);
        
        // Save the new component order immediately
        console.log('Saving component order:', newOrder);
        saveBlueprint(lists, true, undefined, undefined, undefined, undefined, newOrder);
      }
      
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    const draggedIndex = lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    const newLists = [...lists];
    const [draggedList] = newLists.splice(draggedIndex, 1);
    newLists.splice(insertionIndex, 0, draggedList);
    setLists(newLists);
    saveBlueprint(newLists, true, undefined, undefined, undefined, undefined, componentOrder);

    setDraggedListId(null);
    setInsertionIndex(null);
  }, [lists, insertionIndex, setLists, saveBlueprint, componentOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedListId(null);
    setInsertionIndex(null);
  }, []);

  // Function to update component order from external source (like loaded blueprint)
  const updateComponentOrder = useCallback((newOrder: string[]) => {
    setComponentOrder(newOrder);
  }, []);

  return {
    draggedListId,
    insertionIndex,
    componentOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder
  };
};
