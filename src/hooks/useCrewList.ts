
import { useState, useEffect, useRef } from 'react';
import { CrewMember } from '@/types/crew';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  // Load crew data from blueprint
  useEffect(() => {
    if (!user || !rundownId || isInitialized) return;

    const loadCrewData = async () => {
      try {
        const { data, error } = await supabase
          .from('blueprints')
          .select('*')
          .eq('user_id', user.id)
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (!error && data) {
          setSavedBlueprint(data);
          if (data.crew_data && Array.isArray(data.crew_data) && data.crew_data.length > 0) {
            setCrewMembers(data.crew_data);
          }
        }
      } catch (error) {
        console.error('Error loading crew data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCrewData();
  }, [user, rundownId, isInitialized]);

  // Auto-save crew data
  useEffect(() => {
    if (!isInitialized || !user || !rundownId || isSavingRef.current) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(async () => {
      if (!isSavingRef.current) {
        isSavingRef.current = true;
        
        try {
          const blueprintData = {
            user_id: user.id,
            rundown_id: rundownId,
            rundown_title: rundownTitle,
            lists: savedBlueprint?.lists || [],
            show_date: savedBlueprint?.show_date,
            notes: savedBlueprint?.notes,
            crew_data: crewMembers,
            camera_plots: savedBlueprint?.camera_plots,
            updated_at: new Date().toISOString()
          };

          if (savedBlueprint) {
            const { error } = await supabase
              .from('blueprints')
              .update(blueprintData)
              .eq('id', savedBlueprint.id)
              .eq('user_id', user.id);

            if (error) throw error;
          } else {
            const { data, error } = await supabase
              .from('blueprints')
              .insert(blueprintData)
              .select()
              .single();

            if (error) throw error;
            setSavedBlueprint(data);
          }
        } catch (error) {
          console.error('Error auto-saving crew data:', error);
        } finally {
          isSavingRef.current = false;
        }
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [crewMembers, isInitialized, user, rundownId, rundownTitle, savedBlueprint]);

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
