
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface CrewMember {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

const CrewList = () => {
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

  return (
    <Card className="w-full mt-8 bg-gray-800 border-gray-700">
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
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Role</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Name</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Phone Number</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-300 w-1/4">Email</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {crewMembers.map((member) => (
                <tr key={member.id} className="border-b border-gray-700">
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
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrewList;
