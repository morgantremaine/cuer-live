
import { useState, useEffect, useRef } from 'react';
import { CrewMember } from '@/types/crew';
import { useBlueprintPersistence } from '@/hooks/blueprint/useBlueprintPersistence';

export const useCrewList = (rundownId: string, rundownTitle: string) => {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationRef = useRef(false);

  // Get blueprint persistence functions
  const { loadBlueprint, saveBlueprint } = useBlueprintPersistence(
    rundownId,
    rundownTitle,
    '', // showDate not needed for crew
    savedBlueprint,
    setSavedBlueprint
  );

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

  // Initialize crew data and load from blueprint if exists
  useEffect(() => {
    if (!rundownId || isInitialized || initializationRef.current) return;
    
    initializationRef.current = true;
    
    const initializeCrewData = async () => {
      try {
        // Start with default crew members
        const defaultMembers = createDefaultCrewMembers();
        setCrewMembers(defaultMembers);
        
        // Try to load from blueprint
        const blueprintData = await loadBlueprint();
        if (blueprintData?.crew_data && Array.isArray(blueprintData.crew_data) && blueprintData.crew_data.length > 0) {
          setCrewMembers(blueprintData.crew_data);
        }
      } catch (error) {
        console.log('Failed to load crew data, using defaults');
        // Keep default data on error
      } finally {
        setIsInitialized(true);
        initializationRef.current = false;
      }
    };
    
    initializeCrewData();
  }, [rundownId, isInitialized, loadBlueprint]);

  // Debounced auto-save crew data changes
  const saveCrewData = async (updatedMembers: CrewMember[]) => {
    if (!isInitialized) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Only save crew data, don't overwrite other blueprint data
        await saveBlueprint(
          [], // empty lists - don't overwrite
          true, // silent save
          undefined, // don't change show_date
          undefined, // don't change notes
          updatedMembers, // only update crew data
          undefined // don't change camera_plots
        );
      } catch (error) {
        console.error('Failed to save crew data:', error);
      }
    }, 1000);
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
    saveCrewData(updatedMembers);
  };

  const reorderMembers = (draggedIndex: number, targetIndex: number) => {
    const newMembers = [...crewMembers];
    const [draggedMember] = newMembers.splice(draggedIndex, 1);
    newMembers.splice(targetIndex, 0, draggedMember);
    setCrewMembers(newMembers);
    saveCrewData(newMembers);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    crewMembers,
    addRow,
    deleteRow,
    updateMember,
    reorderMembers
  };
};
