
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical } from 'lucide-react';
import { CrewListProps } from '@/types/crew';
import { useCrewRowDragDrop } from '@/hooks/useCrewRowDragDrop';
import { useUnifiedCrewList } from '@/hooks/blueprint/useUnifiedCrewList';
import CrewTable from './crew/CrewTable';

const CrewList = ({ 
  rundownId, 
  rundownTitle, 
  isDragging, 
  onDragStart, 
  onDragEnterContainer, 
  onDragEnd 
}: CrewListProps) => {
  const {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers,
    isLoading
  } = useUnifiedCrewList();

  const {
    draggedRowId,
    dropTargetIndex,
    handleRowDragStart,
    handleRowDragOver,
    handleRowDrop,
    handleRowDragEnd
  } = useCrewRowDragDrop(reorderMembers);

  if (isLoading) {
    return (
      <Card className="w-full mt-8 bg-gray-800 border-gray-700">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`w-full mt-8 bg-gray-800 border-gray-700 ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, 'crew-list')}
      onDragEnter={(e) => onDragEnterContainer?.(e, -1)}
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
