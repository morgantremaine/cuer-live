
import { useCallback } from 'react';
import { CrewMember } from '@/types/crew';

interface UseNewCrewListProps {
  crewMembers: CrewMember[];
  updateCrewData: (crewData: CrewMember[]) => void;
}

export const useNewCrewList = ({ crewMembers, updateCrewData }: UseNewCrewListProps) => {
  console.log('🔵 useNewCrewList initialized with', crewMembers.length, 'members');
  
  const createDefaultCrewMembers = (): CrewMember[] => {
    return Array.from({ length: 5 }, (_, index) => ({
      id: `crew-${index + 1}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    }));
  };

  const addRow = useCallback(() => {
    console.log('➕ Adding new crew member');
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    const updatedMembers = [...crewMembers, newMember];
    console.log('👥 Updated crew count:', updatedMembers.length);
    updateCrewData(updatedMembers);
  }, [crewMembers, updateCrewData]);

  const deleteRow = useCallback((id: string) => {
    if (crewMembers.length > 1) {
      console.log('🗑️ Deleting crew member:', id);
      const updatedMembers = crewMembers.filter(member => member.id !== id);
      console.log('👥 Updated crew count:', updatedMembers.length);
      updateCrewData(updatedMembers);
    } else {
      console.log('⚠️ Cannot delete last crew member');
    }
  }, [crewMembers, updateCrewData]);

  const updateMember = useCallback((id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    console.log('✏️ Updating crew member:', id, field, '=', value);
    const updatedMembers = crewMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    );
    updateCrewData(updatedMembers);
  }, [crewMembers, updateCrewData]);

  const reorderMembers = useCallback((draggedIndex: number, targetIndex: number) => {
    console.log('🔄 Reordering crew members from', draggedIndex, 'to', targetIndex);
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    updateCrewData(newMembers);
  }, [crewMembers, updateCrewData]);

  // Initialize with default crew members if empty (only when explicitly called)
  const ensureMinimumCrewMembers = useCallback(() => {
    if (crewMembers.length === 0) {
      console.log('🆕 Initializing with default crew members');
      updateCrewData(createDefaultCrewMembers());
    }
  }, [crewMembers.length, updateCrewData]);

  return {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers,
    ensureMinimumCrewMembers
  };
};
