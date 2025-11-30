import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TalentPresetSlotProps {
  slot: number;
  name?: string;
  color?: string;
  onUpdate: (name: string, color?: string) => void;
  onClear: () => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const TalentPresetSlot = ({ slot, name, color, onUpdate, onClear }: TalentPresetSlotProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name || '');
  const [editColor, setEditColor] = useState(color || DEFAULT_COLORS[(slot - 1) % DEFAULT_COLORS.length]);
  
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌥' : 'Alt+';

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(editName.trim(), editColor);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(name || '');
      setIsEditing(false);
    }
  };

  if (!name && !isEditing) {
    return (
      <div 
        className="group relative h-12 border border-dashed border-border rounded-md flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">{modifierKey}{slot}</kbd>
          <span className="text-xs">Click to add talent</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="h-12 border border-primary rounded-md flex items-center gap-2 px-3 bg-accent/5">
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded shrink-0">{modifierKey}{slot}</kbd>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Talent name"
          className="h-8 flex-1 text-sm"
          autoFocus
        />
        <div className="flex gap-1">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                editColor === c ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
              style={{ backgroundColor: c }}
              onMouseDown={(e) => {
                e.preventDefault();
                setEditColor(c);
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative h-12 border border-border rounded-md flex items-center gap-2 px-3 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded shrink-0">{modifierKey}{slot}</kbd>
      <div 
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium flex-1 truncate">{name}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
