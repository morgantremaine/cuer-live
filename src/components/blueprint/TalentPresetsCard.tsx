import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TalentPresetSlot } from './talentPresets/TalentPresetSlot';
import { TalentPreset } from '@/types/talentPreset';
import { useBlueprint } from '@/contexts/BlueprintContext';
import { Keyboard } from 'lucide-react';

export const TalentPresetsCard = () => {
  const { state, updateTalentPresets } = useBlueprint();
  const { talentPresets } = state;

  const handleUpdateSlot = (slot: number, name: string, color?: string) => {
    const updated = [...talentPresets];
    const existingIndex = updated.findIndex(p => p.slot === slot);
    
    const preset: TalentPreset = { slot, name, color };
    
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
              Talent Quick-Insert
            </CardTitle>
            <CardDescription className="mt-1.5">
              Set up talent presets for quick insertion in the rundown with Alt + 1-9 (Windows) or Cmd + Shift + 1-9 (Mac)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </CardContent>
    </Card>
  );
};
