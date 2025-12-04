import React, { createContext, useContext, useEffect, useState } from 'react';
import { TalentPreset } from '@/types/talentPreset';
import { supabase } from '@/integrations/supabase/client';

interface TalentPresetsContextValue {
  talentPresets: TalentPreset[];
  getTalentBySlot: (slot: number) => TalentPreset | undefined;
}

const TalentPresetsContext = createContext<TalentPresetsContextValue | null>(null);

interface TalentPresetsProviderProps {
  rundownId: string;
  children: React.ReactNode;
}

export const TalentPresetsProvider = ({ rundownId, children }: TalentPresetsProviderProps) => {
  const [talentPresets, setTalentPresets] = useState<TalentPreset[]>([]);

  useEffect(() => {
    const loadTalentPresets = async () => {
      const { data: blueprint } = await supabase
        .from('blueprints')
        .select('talent_presets')
        .eq('rundown_id', rundownId)
        .maybeSingle();

      if (blueprint?.talent_presets) {
        setTalentPresets(blueprint.talent_presets as TalentPreset[]);
      }
    };

    loadTalentPresets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`talent-presets-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprints',
          filter: `rundown_id=eq.${rundownId}`,
        },
        (payload) => {
          if (payload.new?.talent_presets) {
            setTalentPresets(payload.new.talent_presets as TalentPreset[]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [rundownId]);

  const getTalentBySlot = (slot: number): TalentPreset | undefined => {
    return talentPresets.find(p => p.slot === slot);
  };

  return (
    <TalentPresetsContext.Provider value={{ talentPresets, getTalentBySlot }}>
      {children}
    </TalentPresetsContext.Provider>
  );
};

export const useTalentPresets = () => {
  const context = useContext(TalentPresetsContext);
  if (!context) {
    throw new Error('useTalentPresets must be used within TalentPresetsProvider');
  }
  return context;
};
