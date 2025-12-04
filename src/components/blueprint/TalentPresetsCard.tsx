import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TalentPresetSlot } from './talentPresets/TalentPresetSlot';
import { TalentPreset } from '@/types/talentPreset';
import { useBlueprint } from '@/contexts/BlueprintContext';
import { Keyboard } from 'lucide-react';

export const TalentPresetsCard = () => {
  const { state, updateTalentPresets } = useBlueprint();
  const { talentPresets } = state;

  const handleUpdateSlot = (slot: number, name: string, color?: string, type?: 'talent' | 'text') => {
    const updated = [...talentPresets];
    const existingIndex = updated.findIndex(p => p.slot === slot);
    
    const preset: TalentPreset = { slot, name, color, type: type || 'talent' };
    
    if (existingIndex >= 0) {
      updated[existingIndex] = preset;
    } else {
      updated.push(preset);
    }
    
    updateTalentPresets(updated);
  };

  const handleClearSlot = (slot: number) => {
    const updated = talentPresets.filter(p => p.slot !== slot);
    updateTalentPresets(updated);
  };

  const getPresetForSlot = (slot: number): TalentPreset | undefined => {
    return talentPresets.find(p => p.slot === slot);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Quick-Insert
            </CardTitle>
            <CardDescription className="mt-1.5">
              Set up presets for quick insertion while typing. Use Alt + 1-9 (Windows) or Ctrl + 1-9 (Mac). Choose talent mode for formatted [Name] badges with color, or text mode for plain text.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((slot) => {
            const preset = getPresetForSlot(slot);
            return (
            <TalentPresetSlot
              key={slot}
              slot={slot}
              name={preset?.name}
              color={preset?.color}
              type={preset?.type}
              onUpdate={(name, color, type) => handleUpdateSlot(slot, name, color, type)}
              onClear={() => handleClearSlot(slot)}
            />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
