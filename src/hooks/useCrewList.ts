
import { useState, useEffect, useRef } from 'react';
import { CrewMember } from '@/types/crew';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const useCrewList = (
  rundownId: string, 
  rundownTitle: string,
  saveBlueprint?: (lists?: any[], silent?: boolean, notes?: string, crewData?: any[], cameraPlots?: any[]) => void
) => {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(() => {
    return Array.from({ length: 5 }, (_, index) => ({
      id: `crew-${index + 1}`,
      role: '',
      name: '',
      phone: '',
      email: ''
    }));
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveStateRef = useRef<string>('');

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

        if (!error && data && data.crew_data && Array.isArray(data.crew_data) && data.crew_data.length > 0) {
          setCrewMembers(data.crew_data);
        }
      } catch (error) {
        console.error('Error loading crew data:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCrewData();
  }, [user, rundownId, isInitialized]);

  // Auto-save with debouncing using unified save function
  useEffect(() => {
    if (!isInitialized || !saveBlueprint) return;

    const currentState = JSON.stringify(crewMembers);
    if (currentState === lastSaveStateRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    lastSaveStateRef.current = currentState;

    saveTimeoutRef.current = setTimeout(() => {
      console.log('Crew list: Auto-saving crew data with', crewMembers.length, 'members');
      saveBlueprint(undefined, true, undefined, crewMembers);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [crewMembers, isInitialized, saveBlueprint]);

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
