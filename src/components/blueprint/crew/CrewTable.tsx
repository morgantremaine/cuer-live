
import React from 'react';
import { CrewMember } from '@/types/crew';
import CrewMemberRow from './CrewMemberRow';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {crewMembers.map((member, index) => (
          <div key={member.id} className="relative">
            {dropTargetIndex === index && draggedRowId && (
              <div className="h-1 bg-blue-500 rounded-full mb-2 animate-pulse" />
            )}
            <div 
              className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${
                draggedRowId === member.id ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={(e) => onDragStart(e, member.id)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Role</label>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => onUpdate(member.id, 'role', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Role"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => onUpdate(member.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={member.phone}
                    onChange={(e) => onUpdate(member.id, 'phone', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone Number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => onUpdate(member.id, 'email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                </div>
              </div>
              {crewMembers.length > 1 && (
                <button
                  onClick={() => onDelete(member.id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        {dropTargetIndex === crewMembers.length && draggedRowId && (
          <div className="h-1 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

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
