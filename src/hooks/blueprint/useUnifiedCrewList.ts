
import { useMemo } from 'react';
import { useBlueprintContext } from '@/contexts/BlueprintContext';
import { CrewMember } from '@/types/crew';

export const useUnifiedCrewList = () => {
  const { state, updateCrewData } = useBlueprintContext();

  // Create default crew members
  const createDefaultCrewMembers = (): CrewMember[] => {
    return Array.from({ length: 5 }, (_, index) => ({
      id: `crew-${index + 1}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    }));
  };

  // Get crew members, with defaults if empty
  const crewMembers = useMemo(() => {
    if (state.crewData.length === 0) {
      return createDefaultCrewMembers();
    }
    return state.crewData;
  }, [state.crewData]);

  const addRow = () => {
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    updateCrewData([...crewMembers, newMember]);
  };

  const deleteRow = (id: string) => {
    if (crewMembers.length > 1) {
      updateCrewData(crewMembers.filter(member => member.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    const updatedMembers = crewMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    );
    updateCrewData(updatedMembers);
  };

  const reorderMembers = (draggedIndex: number, targetIndex: number) => {
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    updateCrewData(newMembers);
  };

  return {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers,
    isLoading: state.isLoading,
    isSaving: state.isSaving
  };
};
