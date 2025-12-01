import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TalentPresetSlot } from '@/components/blueprint/talentPresets/TalentPresetSlot';
import { TalentPreset } from '@/types/talentPreset';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { Keyboard } from 'lucide-react';

interface TalentPresetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rundownId: string;
}

export const TalentPresetsDialog: React.FC<TalentPresetsDialogProps> = ({
  open,
  onOpenChange,
  rundownId
}) => {
  const [talentPresets, setTalentPresets] = useState<TalentPreset[]>([]);

  // Load talent presets from database
  useEffect(() => {
    if (!open || !rundownId) return;

    const loadPresets = async () => {
      try {
        const { data, error } = await supabase
          .from('blueprints')
          .select('talent_presets')
          .eq('rundown_id', rundownId)
          .maybeSingle();

        if (error) throw error;

        if (data?.talent_presets) {
          setTalentPresets(data.talent_presets as TalentPreset[]);
        }
      } catch (error) {
        logger.error('Failed to load talent presets:', error);
      }
    };

    loadPresets();
  }, [open, rundownId]);

  // Setup realtime subscription for updates
  useEffect(() => {
    if (!open || !rundownId) return;

    const channel = supabase
      .channel(`talent-presets-dialog-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprints',
          filter: `rundown_id=eq.${rundownId}`
        },
        (payload) => {
          if (payload.new?.talent_presets) {
            setTalentPresets(payload.new.talent_presets as TalentPreset[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, rundownId]);

  // Save talent presets to database
  const savePresets = async (updatedPresets: TalentPreset[]) => {
    try {
      const { error } = await supabase
        .from('blueprints')
        .update({ talent_presets: updatedPresets })
        .eq('rundown_id', rundownId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save talent presets:', error);
    }
  };

  const handleUpdateSlot = (slot: number, name: string, color?: string) => {
    const updated = [...talentPresets];
    const existingIndex = updated.findIndex(p => p.slot === slot);
    
    const preset: TalentPreset = { slot, name, color };
    
    if (existingIndex >= 0) {
      updated[existingIndex] = preset;
    } else {
      updated.push(preset);
    }
    
    setTalentPresets(updated);
    savePresets(updated);
  };

  const handleClearSlot = (slot: number) => {
    const updated = talentPresets.filter(p => p.slot !== slot);
    setTalentPresets(updated);
    savePresets(updated);
  };

  const getPresetForSlot = (slot: number): TalentPreset | undefined => {
    return talentPresets.find(p => p.slot === slot);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Talent Quick-Insert
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            Set up talent presets for quick insertion in the rundown with Alt + 1-9 (Windows) or Cmd + Shift + 1-9 (Mac)
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => {
            const preset = getPresetForSlot(slot);
            return (
              <TalentPresetSlot
                key={slot}
                slot={slot}
                name={preset?.name}
                color={preset?.color}
                onUpdate={(name, color) => handleUpdateSlot(slot, name, color)}
                onClear={() => handleClearSlot(slot)}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
