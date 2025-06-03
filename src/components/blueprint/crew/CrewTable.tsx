
import React from 'react';
import { CrewMember } from '@/types/crew';
import CrewMemberRow from './CrewMemberRow';

interface CrewTableProps {
  crewMembers: CrewMember[];
  draggedRowId: string | null;
  dropTargetIndex: number | null;
  onUpdate: (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDragOver: (e: React.DragEvent, targetIndex: number) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const CrewTable = ({
  crewMembers,
  draggedRowId,
  dropTargetIndex,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: CrewTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="w-8"></th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Role</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Name</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Phone Number</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Email</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {crewMembers.map((member, index) => (
            <CrewMemberRow
              key={member.id}
              member={member}
              index={index}
              isBeingDragged={draggedRowId === member.id}
              showDropIndicator={dropTargetIndex === index && !!draggedRowId}
              canDelete={crewMembers.length > 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
          {dropTargetIndex === crewMembers.length && draggedRowId && (
            <tr>
              <td colSpan={6}>
                <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CrewTable;
