
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical } from 'lucide-react';
import { CrewListProps } from '@/types/crew';
import { useCrewList } from '@/hooks/useCrewList';
import { useCrewRowDragDrop } from '@/hooks/useCrewRowDragDrop';
import CrewTable from './crew/CrewTable';

interface ExtendedCrewListProps extends CrewListProps {
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, listId: string) => void;
  onDragEnterContainer?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const CrewList = ({ 
  rundownId, 
  rundownTitle, 
  isDragging = false,
  onDragStart, 
  onDragEnterContainer, 
  onDragEnd 
}: ExtendedCrewListProps) => {
  const {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers
  } = useCrewList(rundownId, rundownTitle);

  const {
    draggedRowId,
    dropTargetIndex,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDrop,
    handleRowDragEnd
  } = useCrewRowDragDrop(reorderMembers);

  return (
    <Card 
      className={`w-full bg-gray-800 border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, 'crew-list')}
      onDragEnter={onDragEnterContainer}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            <CardTitle className="text-xl text-white">Crew List</CardTitle>
          </div>
          <Button
            onClick={addRow}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <CrewTable
          crewMembers={crewMembers}
          draggedRowId={draggedRowId}
          dropTargetIndex={dropTargetIndex}
          onUpdate={updateMember}
          onDelete={deleteRow}
          onDragStart={handleRowDragStart}
          onDragOver={handleRowDragOver}
          onDrop={(e, targetIndex) => handleRowDrop(e, targetIndex, crewMembers)}
          onDragEnd={handleRowDragEnd}
        />
      </CardContent>
    </Card>
  );
};

export default CrewList;
