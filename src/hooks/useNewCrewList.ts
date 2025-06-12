
import { useCallback } from 'react';
import { CrewMember } from '@/types/crew';

interface UseNewCrewListProps {
  crewMembers: CrewMember[];
  updateCrewData: (crewData: CrewMember[]) => void;
}

export const useNewCrewList = ({ crewMembers, updateCrewData }: UseNewCrewListProps) => {
  
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
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    updateCrewData([...crewMembers, newMember]);
  }, [crewMembers, updateCrewData]);

  const deleteRow = useCallback((id: string) => {
    if (crewMembers.length > 1) {
      updateCrewData(crewMembers.filter(member => member.id !== id));
    }
  }, [crewMembers, updateCrewData]);

  const updateMember = useCallback((id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    updateCrewData(
      crewMembers.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    );
  }, [crewMembers, updateCrewData]);

  const reorderMembers = useCallback((draggedIndex: number, targetIndex: number) => {
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    updateCrewData(newMembers);
  }, [crewMembers, updateCrewData]);

  // Initialize with default crew members if empty
  const ensureMinimumCrewMembers = useCallback(() => {
    if (crewMembers.length === 0) {
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
