
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface CrewMember {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

interface CrewListProps {
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, listId: string) => void;
  onDragEnterContainer?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
}

const CrewList = ({ isDragging, onDragStart, onDragEnterContainer, onDragEnd }: CrewListProps) => {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(() => {
    // Initialize with 5 empty rows
    return Array.from({ length: 5 }, (_, index) => ({
      id: `crew-${index + 1}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    }));
  });

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const addRow = () => {
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    setCrewMembers([...crewMembers, newMember]);
  };

  const deleteRow = (id: string) => {
    if (crewMembers.length > 1) {
      setCrewMembers(crewMembers.filter(member => member.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    setCrewMembers(crewMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  };

  const handleRowDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRowId) {
      setDropTargetIndex(targetIndex);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedRowId) return;

    const draggedIndex = crewMembers.findIndex(member => member.id === draggedRowId);
    if (draggedIndex === -1) return;

    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);

    setCrewMembers(newMembers);
    setDraggedRowId(null);
    setDropTargetIndex(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
    setDropTargetIndex(null);
  };

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
          <CardTitle className="text-xl text-white">Crew List</CardTitle>
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
                <React.Fragment key={member.id}>
                  {dropTargetIndex === index && draggedRowId && (
                    <tr>
                      <td colSpan={6}>
                        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
                      </td>
                    </tr>
                  )}
                  <tr 
                    className={`border-b border-gray-700 ${draggedRowId === member.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleRowDragStart(e, member.id)}
                    onDragOver={(e) => handleRowDragOver(e, index)}
                    onDrop={(e) => handleRowDrop(e, index)}
                    onDragEnd={handleRowDragEnd}
                  >
                    <td className="py-2 px-3">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={member.role}
                        onChange={(e) => updateMember(member.id, 'role', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Role"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={member.name}
                        onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Name"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={member.phone}
                        onChange={(e) => updateMember(member.id, 'phone', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Phone"
                        type="tel"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={member.email}
                        onChange={(e) => updateMember(member.id, 'email', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Email"
                        type="email"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        onClick={() => deleteRow(member.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        disabled={crewMembers.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </React.Fragment>
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
      </CardContent>
    </Card>
  );
};

export default CrewList;
