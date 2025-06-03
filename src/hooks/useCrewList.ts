
import { useState, useEffect } from 'react';
import { CrewMember } from '@/types/crew';
import { useBlueprintStorage } from '@/hooks/useBlueprintStorage';

export const useCrewList = (rundownId: string, rundownTitle: string) => {
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

  const [isInitialized, setIsInitialized] = useState(false);
  const { savedBlueprint, saveBlueprint } = useBlueprintStorage(rundownId);

  // Load saved crew data when blueprint is loaded
  useEffect(() => {
    if (savedBlueprint && !isInitialized) {
      if (savedBlueprint.crew_data && Array.isArray(savedBlueprint.crew_data) && savedBlueprint.crew_data.length > 0) {
        setCrewMembers(savedBlueprint.crew_data);
      }
      setIsInitialized(true);
    }
  }, [savedBlueprint, isInitialized]);

  // Auto-save crew data whenever it changes
  useEffect(() => {
    if (isInitialized && rundownId && rundownTitle) {
      const saveTimeout = setTimeout(() => {
        saveBlueprint(
          rundownTitle,
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true, // silent save
          savedBlueprint?.notes,
          crewMembers
        );
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(saveTimeout);
    }
  }, [crewMembers, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint]);

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

  const reorderMembers = (draggedIndex: number, targetIndex: number) => {
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    setCrewMembers(newMembers);
  };

  return {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers
  };
};
