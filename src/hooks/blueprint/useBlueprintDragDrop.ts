
import { useState, useCallback } from 'react';
import { BlueprintList } from '@/types/blueprint';

export const useBlueprintDragDrop = (
  lists: BlueprintList[],
  setLists: (lists: BlueprintList[]) => void,
  saveBlueprint: (lists: BlueprintList[], silent?: boolean, showDateOverride?: string, notesOverride?: string, crewDataOverride?: any, cameraPlots?: any, componentOrder?: string[]) => Promise<void>,
  initialComponentOrder: string[] = ['crew-list', 'camera-plot', 'scratchpad']
) => {
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  // Use the component order from the unified state instead of local state
  console.log('📋 Drag and drop using component order:', initialComponentOrder);

  const handleDragStart = useCallback((e: React.DragEvent, listId: string) => {
    console.log('📋 Drag start:', listId);
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', listId);
    
    // Add visual feedback
    e.currentTarget.classList.add('opacity-50');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnterContainer = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedListId) {
      console.log('📋 Drag enter container at index:', index, 'for item:', draggedListId);
      
      // For component items (crew-list, camera-plot, scratchpad)
      if (draggedListId === 'crew-list' || draggedListId === 'camera-plot' || draggedListId === 'scratchpad') {
        const componentIndex = index - lists.length;
        console.log('📋 Component drag - component index:', componentIndex);
        setInsertionIndex(index);
        return;
      }

      // For list items
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
      
      console.log('📋 List drag - target index:', targetIndex);
      setInsertionIndex(targetIndex);
    }
  }, [draggedListId, lists]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = document.querySelector('[data-drop-container]');
    if (container && !container.contains(e.relatedTarget as Node)) {
      setInsertionIndex(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    console.log('📋 Drop event:', { draggedId, insertionIndex });
    
    if (!draggedId || insertionIndex === null) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle special components reordering
    if (draggedId === 'crew-list' || draggedId === 'camera-plot' || draggedId === 'scratchpad') {
      const newOrder = [...initialComponentOrder];
      const draggedIndex = newOrder.indexOf(draggedId);
      
      if (draggedIndex !== -1) {
        // Remove from current position
        newOrder.splice(draggedIndex, 1);
        
        // Calculate insertion position relative to component order
        let targetPosition = insertionIndex - lists.length;
        if (targetPosition < 0) targetPosition = 0;
        if (targetPosition > newOrder.length) targetPosition = newOrder.length;
        
        // Insert at new position
        newOrder.splice(targetPosition, 0, draggedId);
        
        // Save the new component order immediately
        console.log('📋 Saving component order:', newOrder);
        try {
          await saveBlueprint(lists, true, undefined, undefined, undefined, undefined, newOrder);
        } catch (error) {
          console.error('📋 Failed to save component order:', error);
        }
      }
      
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    // Handle list reordering
    const draggedIndex = lists.findIndex(list => list.id === draggedId);
    if (draggedIndex === -1) {
      setDraggedListId(null);
      setInsertionIndex(null);
      return;
    }

    const newLists = [...lists];
    const [draggedList] = newLists.splice(draggedIndex, 1);
    newLists.splice(insertionIndex, 0, draggedList);
    
    console.log('📋 Reordered lists:', newLists.map(l => l.name));
    setLists(newLists);
    
    try {
      await saveBlueprint(newLists, true, undefined, undefined, undefined, undefined, initialComponentOrder);
    } catch (error) {
      console.error('📋 Failed to save reordered lists:', error);
    }

    setDraggedListId(null);
    setInsertionIndex(null);
  }, [lists, insertionIndex, setLists, saveBlueprint, initialComponentOrder]);

  const handleDragEnd = useCallback(() => {
    console.log('📋 Drag end');
    setDraggedListId(null);
    setInsertionIndex(null);
    
    // Remove visual feedback
    document.querySelectorAll('.opacity-50').forEach(el => {
      el.classList.remove('opacity-50');
    });
  }, []);

  return {
    draggedListId,
    insertionIndex,
    componentOrder: initialComponentOrder, // Return the component order from props
    handleDragStart,
    handleDragOver,
    handleDragEnterContainer,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateComponentOrder: () => {} // No-op since order is managed by the unified state
  };
};
