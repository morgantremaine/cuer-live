
import { useState } from 'react';

export const useCrewRowDragDrop = (onReorder: (draggedIndex: number, targetIndex: number) => void) => {
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
    e.stopPropagation();
  };

  const handleRowDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRowId) {
      setDropTargetIndex(targetIndex);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number, crewMembers: any[]) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedRowId) return;

    const draggedIndex = crewMembers.findIndex(member => member.id === draggedRowId);
    if (draggedIndex === -1) return;

    onReorder(draggedIndex, targetIndex);
    setDraggedRowId(null);
    setDropTargetIndex(null);
  };

  const handleRowDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedRowId(null);
    setDropTargetIndex(null);
  };

  return {
    draggedRowId,
    dropTargetIndex,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDrop,
    handleRowDragEnd
  };
};
