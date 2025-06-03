
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, GripVertical } from 'lucide-react';
import { CrewMember } from '@/types/crew';

interface CrewMemberRowProps {
  member: CrewMember;
  index: number;
  isBeingDragged: boolean;
  showDropIndicator: boolean;
  canDelete: boolean;
  onUpdate: (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDragOver: (e: React.DragEvent, targetIndex: number) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const CrewMemberRow = ({
  member,
  index,
  isBeingDragged,
  showDropIndicator,
  canDelete,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: CrewMemberRowProps) => {
  return (
    <React.Fragment>
      {showDropIndicator && (
        <tr>
          <td colSpan={6}>
            <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
          </td>
        </tr>
      )}
      <tr 
        className={`border-b border-gray-700 ${isBeingDragged ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, member.id)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
      >
        <td className="py-2 px-3">
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
        </td>
        <td className="py-2 px-3">
          <Input
            value={member.role}
            onChange={(e) => onUpdate(member.id, 'role', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            placeholder="Role"
          />
        </td>
        <td className="py-2 px-3">
          <Input
            value={member.name}
            onChange={(e) => onUpdate(member.id, 'name', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            placeholder="Name"
          />
        </td>
        <td className="py-2 px-3">
          <Input
            value={member.phone}
            onChange={(e) => onUpdate(member.id, 'phone', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            placeholder="Phone"
            type="tel"
          />
        </td>
        <td className="py-2 px-3">
          <Input
            value={member.email}
            onChange={(e) => onUpdate(member.id, 'email', e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            placeholder="Email"
            type="email"
          />
        </td>
        <td className="py-2 px-3">
          <Button
            onClick={() => onDelete(member.id)}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            disabled={!canDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    </React.Fragment>
  );
};

export default CrewMemberRow;
