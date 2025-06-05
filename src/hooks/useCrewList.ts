import { useState, useEffect } from 'react';
import { CrewMember } from '@/types/crew';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';

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
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);

  // Get blueprint persistence functions
  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    '', // showDate not needed for crew
    savedBlueprint,
    setSavedBlueprint
  );

  // Initialize crew data and load from blueprint if exists
  useEffect(() => {
    if (!isInitialized && rundownId) {
      const initializeCrewData = async () => {
        try {
          const blueprintData = await loadBlueprint();
          if (blueprintData?.crew_data && Array.isArray(blueprintData.crew_data)) {
            setCrewMembers(blueprintData.crew_data);
          }
        } catch (error) {
          // Silently handle error, keep default data
        }
        setIsInitialized(true);
      };
      initializeCrewData();
    }
  }, [isInitialized, rundownId, loadBlueprint]);

  // Auto-save crew data changes
  const saveCrewData = async (updatedMembers: CrewMember[]) => {
    if (!isInitialized) return;
    
    try {
      await saveBlueprint(
        savedBlueprint?.lists || [],
        true, // silent save
        savedBlueprint?.show_date,
        savedBlueprint?.notes,
        updatedMembers,
        savedBlueprint?.camera_plots
      );
    } catch (error) {
      // Silently handle save errors
    }
  };

  const addRow = () => {
    const newMember: CrewMember = {
      id: `crew-${Date.now()}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    const updatedMembers = [...crewMembers, newMember];
    setCrewMembers(updatedMembers);
    saveCrewData(updatedMembers);
  };

  const deleteRow = (id: string) => {
    if (crewMembers.length > 1) {
      const updatedMembers = crewMembers.filter(member => member.id !== id);
      setCrewMembers(updatedMembers);
      saveCrewData(updatedMembers);
    }
  };

  const updateMember = (id: string, field: keyof Omit<CrewMember, 'id'>, value: string) => {
    const updatedMembers = crewMembers.map(member =>
      member.id === id ? { ...member, [field]: value } : member
    );
    setCrewMembers(updatedMembers);
    // Debounce the save to avoid too many calls during typing
    setTimeout(() => saveCrewData(updatedMembers), 1000);
  };

  const reorderMembers = (draggedIndex: number, targetIndex: number) => {
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    setCrewMembers(newMembers);
    saveCrewData(newMembers);
  };

  return {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers
  };
};
