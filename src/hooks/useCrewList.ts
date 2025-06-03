
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
    console.log('useCrewList: Loading saved blueprint data', { savedBlueprint, isInitialized });
    if (savedBlueprint && savedBlueprint.crew_data && !isInitialized) {
      console.log('useCrewList: Loading saved crew data:', savedBlueprint.crew_data);
      setCrewMembers(savedBlueprint.crew_data);
      setIsInitialized(true);
    } else if (!savedBlueprint?.crew_data && !isInitialized) {
      console.log('useCrewList: No saved crew data, using default');
      setIsInitialized(true);
    }
  }, [savedBlueprint, isInitialized]);

  // Auto-save crew data whenever it changes
  useEffect(() => {
    if (isInitialized && rundownId && rundownTitle) {
      console.log('useCrewList: Crew data changed, scheduling auto-save', { 
        crewMembers, 
        rundownId, 
        rundownTitle,
        isInitialized 
      });
      
      const saveTimeout = setTimeout(() => {
        console.log('useCrewList: Executing auto-save for crew data');
        saveBlueprint(
          rundownTitle,
          savedBlueprint?.lists || [],
          savedBlueprint?.show_date,
          true, // silent save
          savedBlueprint?.notes,
          crewMembers
        );
      }, 1000); // Debounce saves by 1 second

      return () => {
        console.log('useCrewList: Clearing auto-save timeout');
        clearTimeout(saveTimeout);
      };
    }
  }, [crewMembers, isInitialized, rundownId, rundownTitle, savedBlueprint, saveBlueprint]);

  const addRow = () => {
    console.log('useCrewList: Adding new crew row');
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
    console.log('useCrewList: Deleting crew row:', id);
    if (crewMembers.length > 1) {
      setCrewMembers(crewMembers.filter(member => member.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    console.log('useCrewList: Updating crew member:', { id, field, value });
    setCrewMembers(crewMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const reorderMembers = (draggedIndex: number, targetIndex: number) => {
    console.log('useCrewList: Reordering crew members:', { draggedIndex, targetIndex });
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
